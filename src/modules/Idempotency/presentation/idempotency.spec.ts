import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';
import { BadRequestError } from '@/shared/domain/BadRequestError';
import { Tenant } from '@/modules/Tenant/domain/Tenant';
import type {
  ClaimResult,
  IdempotencyStore,
  StoredResponse,
} from '../domain/IdempotencyStore';
import { createIdempotency } from './idempotency';

// Misma semántica que la tabla real: reservar es atómico y la clave es por cliente.
class InMemoryStore implements IdempotencyStore {
  public readonly rows = new Map<
    string,
    { hash: string; response: StoredResponse | null }
  >();

  public claim(
    tenantId: string,
    scope: string,
    key: string,
    requestHash: string,
  ): Promise<ClaimResult> {
    const id = `${String(tenantId)}:${scope}:${key}`;
    const existing = this.rows.get(id);
    if (existing === undefined) {
      this.rows.set(id, { hash: requestHash, response: null });
      return Promise.resolve({ kind: 'claimed' });
    }
    if (existing.hash !== requestHash) {
      return Promise.resolve({ kind: 'mismatch' });
    }
    return Promise.resolve(
      existing.response === null
        ? { kind: 'in-progress' }
        : { kind: 'replay', response: existing.response },
    );
  }

  public complete(
    tenantId: string,
    scope: string,
    key: string,
    response: StoredResponse,
  ): Promise<void> {
    const row = this.rows.get(`${String(tenantId)}:${scope}:${key}`);
    if (row !== undefined) {
      row.response = response;
    }
    return Promise.resolve();
  }

  public release(tenantId: string, scope: string, key: string): Promise<void> {
    this.rows.delete(`${String(tenantId)}:${scope}:${key}`);
    return Promise.resolve();
  }
}

describe('idempotencia de la compra', () => {
  const buildApp = (
    store: IdempotencyStore,
    handler: (req: Request, res: Response) => void | Promise<void>,
    tenantId = '018f6f1a-0000-7000-8000-000000000001',
  ): Express => {
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      (res.locals as { tenant?: Tenant }).tenant = new Tenant(
        tenantId,
        'demo',
        'Demo',
        null,
      );
      next();
    });
    app.post('/checkout', createIdempotency(store, 'store.checkout'), handler);
    app.use(new ErrorHandler().handle);
    return app;
  };

  const body = { items: [{ productId: 1, quantity: 2 }] };

  it('repetir la misma clave devuelve el mismo pedido sin volver a crearlo', async () => {
    const store = new InMemoryStore();
    let created = 0;
    const app = buildApp(store, (_req, res) => {
      created += 1;
      res.status(201).json({ order: { number: `000${String(created)}` } });
    });

    const first = await request(app)
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0001')
      .send(body);
    const second = await request(app)
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0001')
      .send(body);

    expect(created).toBe(1);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replayed']).toBe('true');
  });

  it('la misma clave con otra compra responde 422 y no crea nada', async () => {
    const store = new InMemoryStore();
    let created = 0;
    const app = buildApp(store, (_req, res) => {
      created += 1;
      res.status(201).json({ ok: true });
    });

    await request(app).post('/checkout').set('Idempotency-Key', 'clave-0002').send(body);
    const other = await request(app)
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0002')
      .send({ items: [{ productId: 1, quantity: 5 }] });

    expect(other.status).toBe(422);
    expect(created).toBe(1);
  });

  it('dos compras simultáneas con la misma clave crean un solo pedido', async () => {
    const store = new InMemoryStore();
    let created = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Se espera a que la primera compra esté DENTRO del handler, no un tiempo fijo: con un
    // `setTimeout` la prueba dependería de qué tan cargada esté la máquina.
    let entered: () => void = () => undefined;
    const insideHandler = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const app = buildApp(store, async (_req, res) => {
      created += 1;
      entered();
      await gate;
      res.status(201).json({ ok: true });
    });

    const firstDone = request(app)
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0003')
      .send(body)
      .then((response) => response);
    await insideHandler;
    const concurrent = await request(app)
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0003')
      .send(body);
    release();
    await firstDone;

    expect(concurrent.status).toBe(409);
    expect(concurrent.headers['retry-after']).toBe('2');
    expect(created).toBe(1);
  });

  it('si la compra falla, la clave se suelta para poder reintentar', async () => {
    const store = new InMemoryStore();
    let attempts = 0;
    const app = buildApp(store, (_req, res) => {
      attempts += 1;
      if (attempts === 1) {
        throw new BadRequestError('Solo quedan 1 unidades.');
      }
      res.status(201).json({ ok: true });
    });

    const failed = await request(app)
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0004')
      .send(body);
    const retried = await request(app)
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0004')
      .send(body);

    expect(failed.status).toBe(400);
    expect(retried.status).toBe(201);
    expect(attempts).toBe(2);
  });

  it('la clave de un cliente no choca con la de otro', async () => {
    const store = new InMemoryStore();
    let created = 0;
    const handler = (_req: Request, res: Response): void => {
      created += 1;
      res.status(201).json({ ok: true });
    };

    await request(buildApp(store, handler, '018f6f1a-0000-7000-8000-000000000001'))
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0005')
      .send(body);
    await request(buildApp(store, handler, '018f6f1a-0000-7000-8000-000000000002'))
      .post('/checkout')
      .set('Idempotency-Key', 'clave-0005')
      .send(body);

    expect(created).toBe(2);
  });

  it('sin clave se comporta como siempre', async () => {
    const store = new InMemoryStore();
    let created = 0;
    const app = buildApp(store, (_req, res) => {
      created += 1;
      res.status(201).json({ ok: true });
    });

    await request(app).post('/checkout').send(body);
    await request(app).post('/checkout').send(body);

    expect(created).toBe(2);
  });

  it('rechaza una clave con formato inválido', async () => {
    const app = buildApp(new InMemoryStore(), (_req, res) => {
      res.status(201).json({ ok: true });
    });

    const response = await request(app)
      .post('/checkout')
      .set('Idempotency-Key', 'no')
      .send(body);

    expect(response.status).toBe(400);
  });
});

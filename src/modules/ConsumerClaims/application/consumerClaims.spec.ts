import { BadRequestError } from '@/shared/domain/BadRequestError';
import type { GlobalSettingsRepository } from '@/modules/GlobalSettings/domain/GlobalSettingsRepository';
import type { ConsumerClaimMailer } from '../domain/ConsumerClaimMailer';
import { Order } from '@/modules/Store/domain/Order';
import type { OrderRepository } from '@/modules/Store/domain/OrderRepository';
import {
  ConsumerClaim,
  isWithinWithdrawalWindow,
  RESPONSE_DAYS,
  type ConsumerClaimInput,
} from '../domain/ConsumerClaim';
import type { ConsumerClaimRepository } from '../domain/ConsumerClaimRepository';
import { WithdrawalOutOfWindowError } from '../domain/WithdrawalOutOfWindowError';
import { SubmitConsumerClaimUseCase } from './SubmitConsumerClaimUseCase';
import { ManageConsumerClaimsUseCase } from './ManageConsumerClaimsUseCase';

const TENANT = '018f6f1a-0000-7000-8000-000000000001';
const NOW = new Date('2026-09-22T12:00:00.000Z');
const EMAIL = 'ana@ejemplo.cl';

const daysAgo = (days: number): Date =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const buildOrder = (createdAt: Date, email = EMAIL): Order =>
  new Order(
    'order-1',
    '0007',
    'paid',
    { name: 'Ana Pérez', email, phone: '+56911112222' },
    {
      method: 'shipping',
      shippingCode: null,
      shippingName: null,
      addressLine: null,
      addressCity: null,
      addressRegion: null,
      addressNotes: null,
    },
    [],
    10000,
    0,
    0,
    0,
    10000,
    'CLP',
    null,
    null,
    null,
    null,
    createdAt,
  );

interface FakeClaims extends ConsumerClaimRepository {
  readonly created: ConsumerClaimInput[];
  stored: ConsumerClaim | null;
}

const buildClaims = (stored: ConsumerClaim | null = null): FakeClaims => {
  const created: ConsumerClaimInput[] = [];
  return {
    created,
    stored,
    create: (_tenantId: string, input: ConsumerClaimInput): Promise<ConsumerClaim> => {
      created.push(input);
      return Promise.resolve(
        new ConsumerClaim(
          'claim-1',
          input.kind,
          'pendiente',
          input.orderNumber,
          input.email,
          input.message,
          NOW,
        ),
      );
    },
    listByStatus: (): Promise<ConsumerClaim[]> =>
      Promise.resolve(stored === null ? [] : [stored]),
    resolve: (): Promise<void> => Promise.resolve(),
  };
};

const buildOrders = (order: Order | null): OrderRepository =>
  ({
    findByNumber: (): Promise<Order | null> => Promise.resolve(order),
  }) as unknown as OrderRepository;

const buildSettings = (): GlobalSettingsRepository => {
  return {
    find: jest.fn().mockResolvedValue({
      get: jest.fn().mockImplementation((key: string) => (key === 'contactEmail' ? 'admin@store.com' : 'Tienda')),
      toPrimitives: jest.fn(),
    }),
  };
};

const buildMailer = (): ConsumerClaimMailer => {
  return {
    notifySeller: jest.fn(),
    sendAcknowledgmentToBuyer: jest.fn(),
  };
};

const input = (overrides: Partial<ConsumerClaimInput> = {}): ConsumerClaimInput => ({
  kind: 'retracto',
  orderNumber: '0007',
  email: EMAIL,
  message: '',
  ...overrides,
});

describe('retracto', () => {
  it('se acepta dentro del plazo', async () => {
    const claims = buildClaims();
    const useCase = new SubmitConsumerClaimUseCase(
      claims,
      buildOrders(buildOrder(daysAgo(3))),
      buildSettings(),
      buildMailer()
    );

    await useCase.execute(TENANT, input(), NOW);

    expect(claims.created).toHaveLength(1);
  });

  it('se rechaza pasado el plazo, ofreciendo el camino del reclamo', async () => {
    const useCase = new SubmitConsumerClaimUseCase(
      buildClaims(),
      buildOrders(buildOrder(daysAgo(20))),
      buildSettings(),
      buildMailer()
    );

    await expect(useCase.execute(TENANT, input(), NOW)).rejects.toThrow(
      WithdrawalOutOfWindowError,
    );
  });

  it('el último día todavía cuenta', async () => {
    const claims = buildClaims();
    const useCase = new SubmitConsumerClaimUseCase(
      claims,
      buildOrders(buildOrder(daysAgo(10))),
      buildSettings(),
      buildMailer()
    );

    await useCase.execute(TENANT, input(), NOW);

    expect(claims.created).toHaveLength(1);
  });

  it('exige el número de pedido: sin él no hay compra que revertir', async () => {
    const useCase = new SubmitConsumerClaimUseCase(buildClaims(), buildOrders(null), buildSettings(), buildMailer());

    await expect(
      useCase.execute(TENANT, input({ orderNumber: null }), NOW),
    ).rejects.toThrow(BadRequestError);
  });

  it('un pedido de otro correo responde lo mismo que uno que no existe', async () => {
    // Si dijéramos cuál es el caso, el formulario serviría para adivinar pedidos ajenos.
    const deOtro = new SubmitConsumerClaimUseCase(
      buildClaims(),
      buildOrders(buildOrder(daysAgo(3), 'otro@ejemplo.cl')),
      buildSettings(),
      buildMailer()
    );
    const inexistente = new SubmitConsumerClaimUseCase(buildClaims(), buildOrders(null), buildSettings(), buildMailer());

    const mensajeDeOtro = await deOtro
      .execute(TENANT, input(), NOW)
      .catch((error: Error) => error.message);
    const mensajeInexistente = await inexistente
      .execute(TENANT, input(), NOW)
      .catch((error: Error) => error.message);

    expect(mensajeDeOtro).toBe(mensajeInexistente);
  });
});

describe('reclamo', () => {
  it('no exige pedido ni plazo: puede no haber compra detrás', async () => {
    const claims = buildClaims();
    const useCase = new SubmitConsumerClaimUseCase(claims, buildOrders(null), buildSettings(), buildMailer());

    await useCase.execute(
      TENANT,
      input({ kind: 'reclamo', orderNumber: null, message: 'No me contestan' }),
      NOW,
    );

    expect(claims.created[0].kind).toBe('reclamo');
  });

  it('notifica al vendedor y al comprador', async () => {
    const claims = buildClaims();
    const mailer = buildMailer();
    const useCase = new SubmitConsumerClaimUseCase(claims, buildOrders(null), buildSettings(), mailer);

    await useCase.execute(
      TENANT,
      input({ kind: 'reclamo', orderNumber: null, email: 'foo@bar.com' }),
      NOW,
    );

    expect(mailer.notifySeller).toHaveBeenCalled();
    expect(mailer.sendAcknowledgmentToBuyer).toHaveBeenCalled();
  });

  it('no pierde el reclamo si falla el correo', async () => {
    const claims = buildClaims();
    const mailer = buildMailer();
    (mailer.notifySeller as jest.Mock).mockRejectedValue(new Error('Fallo mail'));
    const useCase = new SubmitConsumerClaimUseCase(claims, buildOrders(null), buildSettings(), mailer);

    await useCase.execute(
      TENANT,
      input({ kind: 'reclamo', orderNumber: null }),
      NOW,
    );

    expect(claims.created).toHaveLength(1);
  });
});

describe('plazo de respuesta', () => {
  it('marca vencido lo que pasó del plazo sin resolverse', async () => {
    const viejo = new ConsumerClaim(
      'claim-1',
      'reclamo',
      'pendiente',
      null,
      EMAIL,
      '',
      daysAgo(RESPONSE_DAYS + 1),
    );

    const [listado] = await new ManageConsumerClaimsUseCase(buildClaims(viejo)).list(
      TENANT,
      null,
      NOW,
    );

    expect(listado.isOverdue).toBe(true);
  });

  it('uno resuelto nunca está vencido', async () => {
    const resuelto = new ConsumerClaim(
      'claim-1',
      'reclamo',
      'aceptado',
      null,
      EMAIL,
      '',
      daysAgo(30),
      daysAgo(29),
    );

    const [listado] = await new ManageConsumerClaimsUseCase(buildClaims(resuelto)).list(
      TENANT,
      null,
      NOW,
    );

    expect(listado.isOverdue).toBe(false);
  });
});

describe('isWithinWithdrawalWindow', () => {
  it('se cuenta desde el pedido, que es el criterio más estricto contra el vendedor', () => {
    expect(isWithinWithdrawalWindow(daysAgo(9), NOW)).toBe(true);
    expect(isWithinWithdrawalWindow(daysAgo(11), NOW)).toBe(false);
  });
});

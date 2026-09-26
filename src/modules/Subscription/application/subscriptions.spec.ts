import { Subscription } from '../domain/Subscription';
import { SubscriptionRepository } from '../domain/SubscriptionRepository';
import { GetSubscriptionsOverviewUseCase } from './GetSubscriptionsOverviewUseCase';
import { RegisterSubscriptionPaymentUseCase } from './RegisterSubscriptionPaymentUseCase';

describe('Subscription Use Cases (Derivación de Estados)', () => {
  let repository: jest.Mocked<SubscriptionRepository>;
  
  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findByTenantId: jest.fn(),
      findAll: jest.fn(),
      savePayment: jest.fn(),
    };
  });

  const createSub = (id: string, tenantId: string, startsAt: Date, billingDay: number, payments: Date[] = [], priceCents: number = 10000): Subscription => {
    return new Subscription(
      id,
      tenantId,
      'Plan Base',
      priceCents,
      startsAt,
      billingDay,
      payments.map((p, i) => ({
        id: `p-${i}`,
        amountCents: priceCents,
        paidAt: p.toISOString(),
        paymentMethod: 'transfer',
      })),
    );
  };

  it('calcula estado "al_dia" cuando el inicio es futuro', () => {
    // start: Jan 10, today: Jan 1
    const sub = createSub('1', 't1', new Date('2026-01-10T12:00:00Z'), 10, []);
    expect(sub.getStatus(new Date('2026-01-01T12:00:00Z'))).toBe('al_dia');
  });

  it('calcula estado "atrasado" en el primer ciclo si no hay pago', () => {
    // start: Jan 10, today: Jan 15, expected: 1
    const sub = createSub('1', 't1', new Date('2026-01-10T12:00:00Z'), 10, []);
    expect(sub.getStatus(new Date('2026-01-15T12:00:00Z'))).toBe('atrasado');
  });

  it('calcula estado "por_vencer" si pagó el primer ciclo y se acerca el segundo', () => {
    // start: Jan 10, billing: 10.
    // 1 payment. Next due date: Feb 10.
    // Today: Feb 6. 
    // expected payments so far (Jan 10) = 1. actual = 1.
    // Days to Feb 10 = 4 (<= 5).
    const sub = createSub('1', 't1', new Date('2026-01-10T12:00:00Z'), 10, [new Date('2026-01-10T12:00:00Z')]);
    expect(sub.getStatus(new Date('2026-02-06T12:00:00Z'))).toBe('por_vencer');
  });
  
  it('calcula estado "al_dia" si pagó el primer ciclo y falta mucho para el segundo', () => {
    // start: Jan 10. 1 payment. Next due date: Feb 10. Today: Jan 20.
    const sub = createSub('1', 't1', new Date('2026-01-10T12:00:00Z'), 10, [new Date('2026-01-10T12:00:00Z')]);
    expect(sub.getStatus(new Date('2026-01-20T12:00:00Z'))).toBe('al_dia');
  });

  it('calcula el ingreso comprometido correcto', async () => {
    // t1 is al_dia (10000), t2 is atrasado (15000), t3 is por_vencer (20000)
    const t1 = createSub('1', 't1', new Date('2026-01-10T12:00:00Z'), 10, [new Date('2026-01-10T12:00:00Z')], 10000);
    const t2 = createSub('2', 't2', new Date('2026-01-10T12:00:00Z'), 10, [], 15000); // atrasado
    const t3 = createSub('3', 't3', new Date('2026-01-10T12:00:00Z'), 10, [new Date('2026-01-10T12:00:00Z')], 20000); 

    repository.findAll.mockResolvedValue([t1, t2, t3]);

    const overview = new GetSubscriptionsOverviewUseCase(repository);
    const result = await overview.execute(new Date('2026-02-06T12:00:00Z')); // t1, t3 are por_vencer
    
    expect(result.rows.find(r => r.tenantId === 't1')?.status).toBe('por_vencer');
    expect(result.rows.find(r => r.tenantId === 't2')?.status).toBe('atrasado');
    expect(result.rows.find(r => r.tenantId === 't3')?.status).toBe('por_vencer');
    
    // MRR is sum of priceCents for non-atrasado (t1 + t3)
    expect(result.totalMrrCents).toBe(30000);
  });

  it('registra un pago y su efecto', async () => {
    const sub = createSub('1', 't1', new Date('2026-01-10T12:00:00Z'), 10, []);
    repository.findByTenantId.mockResolvedValue(sub);

    const usecase = new RegisterSubscriptionPaymentUseCase(repository);
    await usecase.execute('t1', {
      amountCents: 10000,
      paidAt: new Date('2026-01-15T12:00:00Z'),
      paymentMethod: 'tarjeta',
    });

    expect(repository.savePayment).toHaveBeenCalledWith('1', expect.objectContaining({
      amountCents: 10000,
      paymentMethod: 'tarjeta',
    }));
  });

  it('aislamiento entre clientes: fallará al registrar pago de cliente sin sub', async () => {
    repository.findByTenantId.mockResolvedValue(null);

    const usecase = new RegisterSubscriptionPaymentUseCase(repository);
    await expect(usecase.execute('t-otro', {
      amountCents: 10000,
      paidAt: new Date(),
      paymentMethod: 'cash'
    })).rejects.toThrow('Este cliente no tiene una suscripción configurada.');
  });
});

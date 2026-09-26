import { Product } from '../domain/Product';
import { Coupon } from '../domain/Coupon';
import { StoreSettings, type ShippingOption } from '../domain/StoreSettings';
import {
  CheckoutSchema,
  CartSchema,
  Order,
  type CartInput,
  type CheckoutInput,
} from '../domain/Order';
import type { CouponRepository } from '../domain/CouponRepository';
import type { OrderRepository } from '../domain/OrderRepository';
import type { ProductRepository } from '../domain/ProductRepository';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';
import type {
  PaymentContext,
  PaymentGateway,
  PaymentGatewayRegistry,
  PaymentStart,
} from '../domain/PaymentGateway';
import { CheckoutUseCase } from './CheckoutUseCase';
import { QuoteCartUseCase } from './QuoteCartUseCase';
import type { PageRepository } from '@/modules/Page/domain/PageRepository';

const despacho: ShippingOption = {
  code: 'despacho',
  name: 'Despacho',
  priceCents: 3990,
  estimate: null,
  requiresAddress: true,
};

const settingsFor = (overrides: Partial<StoreSettings> = {}): StoreSettings =>
  new StoreSettings(
    '018f6f1a-0000-7000-8000-000000000001',
    overrides.isEnabled ?? true,
    'CLP',
    true,
    19,
    overrides.shippingOptions ?? [despacho],
    overrides.freeShippingThresholdCents ?? null,
    overrides.paymentProvider ?? 'none',
    {},
    null,
    overrides.termsPageSlug ?? null,
  );

const productFor = (overrides: Partial<Product> = {}): Product =>
  new Product(
    '018f6f1a-0000-7000-8000-000000000005',
    'polera',
    'Polera',
    '',
    [],
    overrides.priceCents ?? 10000,
    overrides.salePriceCents ?? null,
    'CLP',
    null,
    [],
    overrides.isActive ?? true,
    false,
    0,
    overrides.stock ?? null,
  );

const settingsRepositoryFor = (
  settings: StoreSettings,
): jest.Mocked<StoreSettingsRepository> => ({
  find: jest.fn().mockResolvedValue(settings),
  save: jest.fn(),
});

const productRepositoryFor = (product: Product | null): jest.Mocked<ProductRepository> =>
  ({
    findById: jest.fn().mockResolvedValue(product),
  }) as unknown as jest.Mocked<ProductRepository>;

const couponRepositoryFor = (coupon: Coupon | null): jest.Mocked<CouponRepository> =>
  ({
    findByCode: jest.fn().mockResolvedValue(coupon),
    registerUse: jest.fn(),
  }) as unknown as jest.Mocked<CouponRepository>;

const cart = (overrides: Record<string, unknown> = {}): CartInput =>
  CartSchema.parse({
    items: [{ productId: '018f6f1a-0000-7000-8000-000000000005', quantity: 2 }],
    ...overrides,
  });

describe('QuoteCartUseCase', () => {
  const quoteWith = (
    settings: StoreSettings,
    product: Product | null,
    coupon: Coupon | null = null,
  ): QuoteCartUseCase =>
    new QuoteCartUseCase(
      settingsRepositoryFor(settings),
      productRepositoryFor(product),
      couponRepositoryFor(coupon),
    );

  it('cobra el precio de la base, no el que venga en la petición', async () => {
    const quote = await quoteWith(
      settingsFor(),
      productFor({ priceCents: 19990 }),
    ).execute('018f6f1a-0000-7000-8000-000000000001', cart());

    expect(quote.lines[0].unitPriceCents).toBe(19990);
    expect(quote.totals.subtotalCents).toBe(39980);
  });

  it('usa el precio de oferta cuando lo hay', async () => {
    const quote = await quoteWith(
      settingsFor(),
      productFor({ priceCents: 20000, salePriceCents: 15000 }),
    ).execute('018f6f1a-0000-7000-8000-000000000001', cart());

    expect(quote.lines[0].unitPriceCents).toBe(15000);
  });

  it('no deja comprar de una tienda apagada', async () => {
    await expect(
      quoteWith(settingsFor({ isEnabled: false }), productFor()).execute(
        '018f6f1a-0000-7000-8000-000000000001',
        cart(),
      ),
    ).rejects.toThrow('no tiene tienda');
  });

  it('no deja comprar un producto inactivo', async () => {
    await expect(
      quoteWith(settingsFor(), productFor({ isActive: false })).execute(
        '018f6f1a-0000-7000-8000-000000000001',
        cart(),
      ),
    ).rejects.toThrow('ya no está disponible');
  });

  it('no deja comprar más unidades que las que quedan', async () => {
    await expect(
      quoteWith(settingsFor(), productFor({ stock: 1 })).execute(
        '018f6f1a-0000-7000-8000-000000000001',
        cart(),
      ),
    ).rejects.toThrow('Solo quedan 1');
  });

  it('avisa que el producto se agotó en vez de hablar de unidades', async () => {
    await expect(
      quoteWith(settingsFor(), productFor({ stock: 0 })).execute(
        '018f6f1a-0000-7000-8000-000000000001',
        cart(),
      ),
    ).rejects.toThrow('se agotó');
  });

  it('ignora el stock de un producto que no lo controla', async () => {
    const quote = await quoteWith(settingsFor(), productFor({ stock: null })).execute(
      '018f6f1a-0000-7000-8000-000000000001',
      cart({
        items: [{ productId: '018f6f1a-0000-7000-8000-000000000005', quantity: 99 }],
      }),
    );

    expect(quote.lines[0].quantity).toBe(99);
  });

  it('aplica un cupón vigente', async () => {
    const coupon = new Coupon(
      '018f6f1a-0000-7000-8000-000000000001',
      'VERANO',
      'percentage',
      10,
      null,
      null,
      null,
      null,
      0,
      true,
    );
    const quote = await quoteWith(settingsFor(), productFor(), coupon).execute(
      '018f6f1a-0000-7000-8000-000000000001',
      cart({ couponCode: 'verano' }),
    );

    expect(quote.coupon).toEqual({ code: 'VERANO', discountCents: 2000 });
    expect(quote.totals.totalCents).toBe(18000);
  });

  it('sigue cotizando cuando el cupón no sirve, e informa por qué', async () => {
    const vencido = new Coupon(
      '018f6f1a-0000-7000-8000-000000000001',
      'VIEJO',
      'amount',
      5000,
      null,
      null,
      new Date('2020-01-01T00:00:00.000Z'),
      null,
      0,
      true,
    );
    const quote = await quoteWith(settingsFor(), productFor(), vencido).execute(
      '018f6f1a-0000-7000-8000-000000000001',
      cart({ couponCode: 'viejo' }),
    );

    expect(quote.coupon).toBeNull();
    expect(quote.couponRejection).toContain('venció');
    expect(quote.totals.totalCents).toBe(20000);
  });

  it('avisa cuando el cupón no existe', async () => {
    const quote = await quoteWith(settingsFor(), productFor(), null).execute(
      '018f6f1a-0000-7000-8000-000000000001',
      cart({ couponCode: 'INVENTADO' }),
    );

    expect(quote.couponRejection).toBe('Ese cupón no existe.');
  });
});

describe('CheckoutUseCase', () => {
  const checkoutInput = (overrides: Record<string, unknown> = {}): CheckoutInput =>
    CheckoutSchema.parse({
      items: [{ productId: '018f6f1a-0000-7000-8000-000000000005', quantity: 2 }],
      customer: { name: 'Ana', email: 'ana@ejemplo.cl', phone: '+56911111111' },
      delivery: { method: 'shipping', addressLine: 'Calle 1' },
      shippingCode: 'despacho',
      ...overrides,
    });

  const context = {
    returnUrl: 'https://tienda.cl/gracias',
    confirmationUrl: 'https://tienda.cl/api/store/payment-callback',
  };

  const orderRepository = (): jest.Mocked<OrderRepository> =>
    ({
      create: jest
        .fn()
        .mockImplementation((_tenantId: number, order: { totalCents: number }) =>
          Promise.resolve(
            new Order(
              '018f6f1a-0000-7000-8000-000000000001',
              '0001',
              'pending',
              { name: 'Ana', email: 'ana@ejemplo.cl', phone: '+56911111111' },
              {
                method: 'shipping',
                shippingCode: 'despacho',
                shippingName: 'Despacho',
                addressLine: 'Calle 1',
                addressCity: null,
                addressRegion: null,
                addressNotes: null,
              },
              [],
              0,
              0,
              0,
              0,
              order.totalCents,
              'CLP',
              null,
              null,
              null,
              null,
              new Date(),
            ),
          ),
        ),
      setPaymentReference: jest.fn(),
    }) as unknown as jest.Mocked<OrderRepository>;

  const build = (
    settings: StoreSettings,
    repository = orderRepository(),
    gateways: PaymentGatewayRegistry = { for: jest.fn() },
    termsPublishedAt: Date | null = null,
  ): { useCase: CheckoutUseCase; repository: jest.Mocked<OrderRepository> } => {
    const quote = new QuoteCartUseCase(
      settingsRepositoryFor(settings),
      productRepositoryFor(productFor()),
      couponRepositoryFor(null),
    );
    const pages = {
      findPublishedAt: jest.fn().mockResolvedValue(termsPublishedAt),
    } as unknown as PageRepository;
    return {
      useCase: new CheckoutUseCase(quote, repository, gateways, pages),
      repository,
    };
  };

  it('guarda el pedido con los totales calculados en el servidor', async () => {
    const { useCase, repository } = build(settingsFor());

    const result = await useCase.execute(
      '018f6f1a-0000-7000-8000-000000000001',
      checkoutInput(),
      context,
    );

    expect(repository.create).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000001',
      expect.objectContaining({
        subtotalCents: 20000,
        shippingCents: 3990,
        totalCents: 23990,
      }),
    );
    expect(result.redirectUrl).toBeNull();
  });

  it('exige dirección cuando la forma de envío la necesita', async () => {
    const { useCase } = build(settingsFor());

    await expect(
      useCase.execute(
        '018f6f1a-0000-7000-8000-000000000001',
        checkoutInput({ delivery: { method: 'shipping' } }),
        context,
      ),
    ).rejects.toThrow('dirección');
  });

  it('no cobra envío ni pide dirección para retiro en tienda', async () => {
    const { useCase, repository } = build(settingsFor());

    await useCase.execute(
      '018f6f1a-0000-7000-8000-000000000001',
      checkoutInput({ delivery: { method: 'pickup' }, shippingCode: null }),
      context,
    );

    expect(repository.create).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000001',
      expect.objectContaining({ shippingCents: 0 }),
    );
  });

  it('manda a pagar y guarda la referencia cuando la tienda cobra en línea', async () => {
    const start = jest.fn(
      (
        _order: Order,
        _settings: StoreSettings,
        _context: PaymentContext,
      ): Promise<PaymentStart> =>
        Promise.resolve({
          reference: 'tk-1',
          redirectUrl: 'https://pago.cl?token=tk-1',
          instructions: null,
        }),
    );
    const gateways = {
      for: jest.fn().mockReturnValue({ provider: 'flow', start, confirm: jest.fn() }),
    } as unknown as PaymentGatewayRegistry;
    const repository = orderRepository();
    const { useCase } = build(
      settingsFor({ paymentProvider: 'flow' }),
      repository,
      gateways,
    );

    const result = await useCase.execute(
      '018f6f1a-0000-7000-8000-000000000001',
      checkoutInput(),
      context,
    );

    expect(start.mock.calls[0][2]).toEqual(context);
    expect(repository.setPaymentReference).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000001',
      '018f6f1a-0000-7000-8000-000000000001',
      'tk-1',
    );
    expect(result.redirectUrl).toBe('https://pago.cl?token=tk-1');
  });

  describe('términos y condiciones de compra', () => {
    const publishedAt = new Date('2026-09-01T12:00:00.000Z');
    const withTerms = settingsFor({ termsPageSlug: 'terminos-de-compra' });

    it('una tienda sin términos vende sin pedir aceptarlos', async () => {
      const { useCase, repository } = build(settingsFor());

      await useCase.execute(
        '018f6f1a-0000-7000-8000-000000000001',
        checkoutInput(),
        context,
      );

      expect(repository.create).toHaveBeenCalledWith(
        '018f6f1a-0000-7000-8000-000000000001',
        expect.objectContaining({ termsAcceptedAt: null, termsVersion: null }),
      );
    });

    it('rechaza la compra si no se aceptaron los términos publicados', async () => {
      const { useCase, repository } = build(
        withTerms,
        orderRepository(),
        undefined,
        publishedAt,
      );

      await expect(
        useCase.execute('018f6f1a-0000-7000-8000-000000000001', checkoutInput(), context),
      ).rejects.toThrow('aceptar los términos');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('guarda cuándo se aceptaron y qué versión', async () => {
      const now = new Date('2026-09-22T15:00:00.000Z');
      const { useCase, repository } = build(
        withTerms,
        orderRepository(),
        undefined,
        publishedAt,
      );

      await useCase.execute(
        '018f6f1a-0000-7000-8000-000000000001',
        checkoutInput({ acceptedTerms: true }),
        context,
        now,
      );

      expect(repository.create).toHaveBeenCalledWith(
        '018f6f1a-0000-7000-8000-000000000001',
        expect.objectContaining({
          termsAcceptedAt: now,
          termsVersion: '2026-09-01T12:00:00.000Z',
        }),
      );
    });

    it('no exige aceptar una página de términos que todavía no se publica', async () => {
      const { useCase, repository } = build(
        withTerms,
        orderRepository(),
        undefined,
        null,
      );

      await useCase.execute(
        '018f6f1a-0000-7000-8000-000000000001',
        checkoutInput(),
        context,
      );

      expect(repository.create).toHaveBeenCalled();
    });
  });

  describe('en una demo (pago simulado)', () => {
    const flowGateway = { provider: 'flow', start: jest.fn(), confirm: jest.fn() };
    // Igual que DemoPaymentGateway: sin proveedor, de vuelta a la URL de retorno.
    const demoGateway = {
      provider: 'demo',
      start: (
        order: Order,
        _settings: StoreSettings,
        ctx: PaymentContext,
      ): Promise<PaymentStart> =>
        Promise.resolve({
          reference: `demo-${order.number}`,
          redirectUrl: ctx.returnUrl,
          instructions: null,
        }),
      confirm: jest.fn(),
    };
    const registry = {
      for: (provider: string): PaymentGateway =>
        provider === 'flow' ? flowGateway : demoGateway,
    };
    const paidRepository = (): jest.Mocked<OrderRepository> => {
      const repository = orderRepository();
      repository.markPaid = jest.fn().mockResolvedValue(
        new Order(
          '018f6f1a-0000-7000-8000-000000000001',
          '0001',
          'paid',
          { name: 'Ana', email: 'ana@ejemplo.cl', phone: '+56911111111' },
          {
            method: 'shipping',
            shippingCode: 'despacho',
            shippingName: 'Despacho',
            addressLine: 'Calle 1',
            addressCity: null,
            addressRegion: null,
            addressNotes: null,
          },
          [],
          0,
          0,
          0,
          0,
          23990,
          'CLP',
          null,
          'demo',
          'demo-0001',
          new Date(),
          new Date(),
        ),
      );
      return repository;
    };

    it('con Flow configurado no llama a Flow y deja el pedido pagado con el proveedor demo', async () => {
      const repository = paidRepository();
      const { useCase } = build(
        settingsFor({ paymentProvider: 'flow' }),
        repository,
        registry,
      );

      const result = await useCase.execute(
        '018f6f1a-0000-7000-8000-000000000001',
        checkoutInput(),
        { ...context, simulatedPayment: true },
      );

      expect(flowGateway.start).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        '018f6f1a-0000-7000-8000-000000000001',
        expect.objectContaining({ paymentProvider: 'demo' }),
      );
      expect(repository.markPaid).toHaveBeenCalledWith(
        '018f6f1a-0000-7000-8000-000000000001',
        '018f6f1a-0000-7000-8000-000000000001',
        'demo-0001',
      );
      expect(result.order.status).toBe('paid');
      // La misma URL de retorno que usaría un pago real: el sitio muestra su confirmación normal.
      expect(result.redirectUrl).toBe(context.returnUrl);
      expect(result.instructions).toBeNull();
    });

    it('también simula cuando la tienda no cobra en línea', async () => {
      const repository = paidRepository();
      const { useCase } = build(
        settingsFor({ paymentProvider: 'none' }),
        repository,
        registry,
      );

      const result = await useCase.execute(
        '018f6f1a-0000-7000-8000-000000000001',
        checkoutInput(),
        { ...context, simulatedPayment: true },
      );

      expect(repository.markPaid).toHaveBeenCalled();
      expect(result.redirectUrl).toBe(context.returnUrl);
    });
  });
});

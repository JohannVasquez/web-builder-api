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
  PaymentGatewayRegistry,
  PaymentStart,
} from '../domain/PaymentGateway';
import { CheckoutUseCase } from './CheckoutUseCase';
import { QuoteCartUseCase } from './QuoteCartUseCase';

const despacho: ShippingOption = {
  code: 'despacho',
  name: 'Despacho',
  priceCents: 3990,
  estimate: null,
  requiresAddress: true,
};

const settingsFor = (overrides: Partial<StoreSettings> = {}): StoreSettings =>
  new StoreSettings(
    1,
    overrides.isEnabled ?? true,
    'CLP',
    true,
    19,
    overrides.shippingOptions ?? [despacho],
    overrides.freeShippingThresholdCents ?? null,
    overrides.paymentProvider ?? 'none',
    {},
    null,
  );

const productFor = (overrides: Partial<Product> = {}): Product =>
  new Product(
    5,
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
  CartSchema.parse({ items: [{ productId: 5, quantity: 2 }], ...overrides });

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
    ).execute(1, cart());

    expect(quote.lines[0].unitPriceCents).toBe(19990);
    expect(quote.totals.subtotalCents).toBe(39980);
  });

  it('usa el precio de oferta cuando lo hay', async () => {
    const quote = await quoteWith(
      settingsFor(),
      productFor({ priceCents: 20000, salePriceCents: 15000 }),
    ).execute(1, cart());

    expect(quote.lines[0].unitPriceCents).toBe(15000);
  });

  it('no deja comprar de una tienda apagada', async () => {
    await expect(
      quoteWith(settingsFor({ isEnabled: false }), productFor()).execute(1, cart()),
    ).rejects.toThrow('no tiene tienda');
  });

  it('no deja comprar un producto inactivo', async () => {
    await expect(
      quoteWith(settingsFor(), productFor({ isActive: false })).execute(1, cart()),
    ).rejects.toThrow('ya no está disponible');
  });

  it('no deja comprar más unidades que las que quedan', async () => {
    await expect(
      quoteWith(settingsFor(), productFor({ stock: 1 })).execute(1, cart()),
    ).rejects.toThrow('Solo quedan 1');
  });

  it('avisa que el producto se agotó en vez de hablar de unidades', async () => {
    await expect(
      quoteWith(settingsFor(), productFor({ stock: 0 })).execute(1, cart()),
    ).rejects.toThrow('se agotó');
  });

  it('ignora el stock de un producto que no lo controla', async () => {
    const quote = await quoteWith(settingsFor(), productFor({ stock: null })).execute(
      1,
      cart({ items: [{ productId: 5, quantity: 99 }] }),
    );

    expect(quote.lines[0].quantity).toBe(99);
  });

  it('aplica un cupón vigente', async () => {
    const coupon = new Coupon(
      1,
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
      1,
      cart({ couponCode: 'verano' }),
    );

    expect(quote.coupon).toEqual({ code: 'VERANO', discountCents: 2000 });
    expect(quote.totals.totalCents).toBe(18000);
  });

  it('sigue cotizando cuando el cupón no sirve, e informa por qué', async () => {
    const vencido = new Coupon(
      1,
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
      1,
      cart({ couponCode: 'viejo' }),
    );

    expect(quote.coupon).toBeNull();
    expect(quote.couponRejection).toContain('venció');
    expect(quote.totals.totalCents).toBe(20000);
  });

  it('avisa cuando el cupón no existe', async () => {
    const quote = await quoteWith(settingsFor(), productFor(), null).execute(
      1,
      cart({ couponCode: 'INVENTADO' }),
    );

    expect(quote.couponRejection).toBe('Ese cupón no existe.');
  });
});

describe('CheckoutUseCase', () => {
  const checkoutInput = (overrides: Record<string, unknown> = {}): CheckoutInput =>
    CheckoutSchema.parse({
      items: [{ productId: 5, quantity: 2 }],
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
              1,
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
  ): { useCase: CheckoutUseCase; repository: jest.Mocked<OrderRepository> } => {
    const quote = new QuoteCartUseCase(
      settingsRepositoryFor(settings),
      productRepositoryFor(productFor()),
      couponRepositoryFor(null),
    );
    return { useCase: new CheckoutUseCase(quote, repository, gateways), repository };
  };

  it('guarda el pedido con los totales calculados en el servidor', async () => {
    const { useCase, repository } = build(settingsFor());

    const result = await useCase.execute(1, checkoutInput(), context);

    expect(repository.create).toHaveBeenCalledWith(
      1,
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
      useCase.execute(1, checkoutInput({ delivery: { method: 'shipping' } }), context),
    ).rejects.toThrow('dirección');
  });

  it('no cobra envío ni pide dirección para retiro en tienda', async () => {
    const { useCase, repository } = build(settingsFor());

    await useCase.execute(
      1,
      checkoutInput({ delivery: { method: 'pickup' }, shippingCode: null }),
      context,
    );

    expect(repository.create).toHaveBeenCalledWith(
      1,
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

    const result = await useCase.execute(1, checkoutInput(), context);

    expect(start.mock.calls[0][2]).toEqual(context);
    expect(repository.setPaymentReference).toHaveBeenCalledWith(1, 1, 'tk-1');
    expect(result.redirectUrl).toBe('https://pago.cl?token=tk-1');
  });
});

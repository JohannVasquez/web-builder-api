import { FlowPaymentGateway, isFlowPaid, signFlowParams } from './FlowPaymentGateway';
import { Order } from '../domain/Order';
import { StoreSettings } from '../domain/StoreSettings';

describe('FlowPaymentGateway', () => {
  const settings = new StoreSettings(
    1,
    true,
    'CLP',
    true,
    19,
    [],
    null,
    'flow',
    { apiKey: 'llave-publica', secretKey: 'llave-secreta' },
    null,
  );

  const order = new Order(
    10,
    '0007',
    'pending',
    { name: 'Ana', email: 'ana@ejemplo.cl', phone: '+56911111111' },
    {
      method: 'pickup',
      shippingCode: null,
      shippingName: null,
      addressLine: null,
      addressCity: null,
      addressRegion: null,
      addressNotes: null,
    },
    [],
    19990,
    0,
    0,
    3193,
    19990,
    'CLP',
    null,
    'flow',
    null,
    null,
    new Date('2026-09-16T12:00:00.000Z'),
  );

  const context = {
    returnUrl: 'https://tienda.cl/gracias',
    confirmationUrl: 'https://tienda.cl/api/store/payment-callback',
  };

  const fetchReturning = (
    body: unknown,
    ok = true,
  ): jest.Mock<Promise<Response>, [string, RequestInit?]> =>
    jest.fn((_input: string, _init?: RequestInit): Promise<Response> =>
      Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response),
    );

  describe('signFlowParams', () => {
    it('ordena los parámetros por nombre antes de firmar', () => {
      const firstOrder = signFlowParams({ b: '2', a: '1' }, 'secreto');
      const otherOrder = signFlowParams({ a: '1', b: '2' }, 'secreto');

      expect(firstOrder).toBe(otherOrder);
    });

    it('cambia la firma si cambia el secreto', () => {
      expect(signFlowParams({ a: '1' }, 'uno')).not.toBe(
        signFlowParams({ a: '1' }, 'dos'),
      );
    });
  });

  it('manda el monto y el número de pedido, y devuelve la url con el token', async () => {
    const fetchFn = fetchReturning({
      url: 'https://sandbox.flow.cl/app/web/pay.php',
      token: 'tk-1',
    });
    const gateway = new FlowPaymentGateway(fetchFn);

    const start = await gateway.start(order, settings, context);

    const init = fetchFn.mock.calls[0][1];
    const body = typeof init?.body === 'string' ? init.body : '';
    expect(body).toContain('amount=19990');
    expect(body).toContain('commerceOrder=0007');
    expect(body).toContain('s=');
    expect(start.redirectUrl).toBe('https://sandbox.flow.cl/app/web/pay.php?token=tk-1');
    expect(start.reference).toBe('tk-1');
  });

  it('usa la url de producción solo cuando el cliente la pidió', async () => {
    const fetchFn = fetchReturning({ url: 'u', token: 't' });
    const production = new StoreSettings(
      1,
      true,
      'CLP',
      true,
      19,
      [],
      null,
      'flow',
      { apiKey: 'a', secretKey: 'b', mode: 'production' },
      null,
    );

    await new FlowPaymentGateway(fetchFn).start(order, production, context);

    expect(fetchFn.mock.calls[0][0]).toContain('https://www.flow.cl/api');
  });

  it('vuelve a preguntarle a Flow en vez de creerle al aviso', async () => {
    const fetchFn = fetchReturning({ status: 2 });
    const gateway = new FlowPaymentGateway(fetchFn);

    const confirmation = await gateway.confirm({ token: 'tk-1', status: 999 }, settings);

    expect(fetchFn.mock.calls[0][0]).toContain('payment/getStatus');
    expect(confirmation).toEqual({ reference: 'tk-1', paid: true });
  });

  it('solo el estado 2 de Flow significa pagado', () => {
    expect(isFlowPaid(2)).toBe(true);
    expect(isFlowPaid(1)).toBe(false);
    expect(isFlowPaid('2')).toBe(false);
  });

  it('avisa cuando la tienda no tiene configurada su cuenta de cobro', async () => {
    const sinCuenta = new StoreSettings(
      1,
      true,
      'CLP',
      true,
      19,
      [],
      null,
      'flow',
      {},
      null,
    );
    const gateway = new FlowPaymentGateway(jest.fn());

    await expect(gateway.start(order, sinCuenta, context)).rejects.toThrow(
      'cuenta de cobro',
    );
  });
});

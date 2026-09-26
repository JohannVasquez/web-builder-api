import express, { type Express, type RequestHandler, type Router } from 'express';
import request from 'supertest';
import { ErrorHandler } from './shared/presentation/ErrorHandler';
import { markDemoRequest } from './shared/presentation/demoRequest';
import { Tenant } from './modules/Tenant/domain/Tenant';
import { RateLimiter } from './modules/ApiKey/application/RateLimiter';
import { GlobalSettings } from './modules/GlobalSettings/domain/GlobalSettings';
import type { GlobalSettingsRepository } from './modules/GlobalSettings/domain/GlobalSettingsRepository';
import { SendContactEmailUseCase } from './modules/Contact/application/SendContactEmailUseCase';
import type { ContactMessageRepository } from './modules/Contact/domain/ContactMessageRepository';
import type { EmailService } from './modules/Contact/domain/EmailService';
import { ContactController } from './modules/Contact/presentation/ContactController';
import { createContactRouter } from './modules/Contact/presentation/contactRouter';
import { SubscribeToNewsletterUseCase } from './modules/Newsletter/application/SubscribeToNewsletterUseCase';
import type { ListSubscribersUseCase } from './modules/Newsletter/application/ListSubscribersUseCase';
import type { UnsubscribeFromNewsletterUseCase } from './modules/Newsletter/application/UnsubscribeFromNewsletterUseCase';
import type { NewsletterRepository } from './modules/Newsletter/domain/NewsletterRepository';
import { NewsletterController } from './modules/Newsletter/presentation/NewsletterController';
import { createNewsletterRouter } from './modules/Newsletter/presentation/newsletterRouter';
import type { ConsentRepository } from './modules/Consent/domain/ConsentRepository';
import { RecordConsentUseCase } from './modules/Consent/application/RecordConsentUseCase';
import type { GetCurrentConsentUseCase } from './modules/Consent/application/GetCurrentConsentUseCase';
import { ConsentController } from './modules/Consent/presentation/ConsentController';
import { createConsentRouter } from './modules/Consent/presentation/consentRouter';
import { SubmitDataRightsRequestUseCase } from './modules/DataRights/application/SubmitDataRightsRequestUseCase';
import { VerifyDataRightsRequestUseCase } from './modules/DataRights/application/VerifyDataRightsRequestUseCase';
import type { ListDataRightsRequestsUseCase } from './modules/DataRights/application/ListDataRightsRequestsUseCase';
import type { ResolveDataRightsRequestUseCase } from './modules/DataRights/application/ResolveDataRightsRequestUseCase';
import type { DataRightsMailer } from './modules/DataRights/domain/DataRightsMailer';
import type { DataRightsRepository } from './modules/DataRights/domain/DataRightsRepository';
import { DataRightsController } from './modules/DataRights/presentation/DataRightsController';
import { createDataRightsRouter } from './modules/DataRights/presentation/dataRightsRouter';
import { SubmitConsumerClaimUseCase } from './modules/ConsumerClaims/application/SubmitConsumerClaimUseCase';
import type { ManageConsumerClaimsUseCase } from './modules/ConsumerClaims/application/ManageConsumerClaimsUseCase';
import { ConsumerClaim } from './modules/ConsumerClaims/domain/ConsumerClaim';
import type { ConsumerClaimMailer } from './modules/ConsumerClaims/domain/ConsumerClaimMailer';
import type { ConsumerClaimRepository } from './modules/ConsumerClaims/domain/ConsumerClaimRepository';
import { ConsumerClaimController } from './modules/ConsumerClaims/presentation/ConsumerClaimController';
import { createConsumerClaimRouter } from './modules/ConsumerClaims/presentation/consumerClaimRouter';
import { QuoteCartUseCase } from './modules/Store/application/QuoteCartUseCase';
import { CheckoutUseCase } from './modules/Store/application/CheckoutUseCase';
import { ConfirmPaymentUseCase } from './modules/Store/application/ConfirmPaymentUseCase';
import { Order, type NewOrder } from './modules/Store/domain/Order';
import type { OrderMailer } from './modules/Store/domain/OrderMailer';
import type { OrderRepository } from './modules/Store/domain/OrderRepository';
import type { PaymentGateway } from './modules/Store/domain/PaymentGateway';
import { Product } from './modules/Store/domain/Product';
import type { ProductRepository } from './modules/Store/domain/ProductRepository';
import type { CouponRepository } from './modules/Store/domain/CouponRepository';
import { StoreSettings } from './modules/Store/domain/StoreSettings';
import type { StoreSettingsRepository } from './modules/Store/domain/StoreSettingsRepository';
import { DefaultPaymentGatewayRegistry } from './modules/Store/infrastructure/DefaultPaymentGatewayRegistry';
import { DemoPaymentGateway } from './modules/Store/infrastructure/DemoPaymentGateway';
import { CheckoutController } from './modules/Store/presentation/CheckoutController';
import { createCheckoutRouter } from './modules/Store/presentation/checkoutRouter';
import type { PageRepository } from './modules/Page/domain/PageRepository';

// DEMO 03: cada acción pública de una demo responde como si hubiera funcionado, pero no le
// escribe ni le cobra a nadie. Cada caso se prueba dos veces: en una demo (con cualquiera de
// los dos enlaces) y en un cliente normal, que tiene que seguir igual que antes.
describe('una demo nunca le escribe ni le cobra a nadie de verdad', () => {
  const TENANT_ID = '018f6f1a-0000-7000-8000-0000000000e1';
  const tenant = new Tenant(TENANT_ID, 'demo-luna', 'Pastelería Luna', null, 'demo');

  type Mode = 'prospect' | 'team' | 'cliente';
  const MODES: readonly Mode[] = ['prospect', 'team', 'cliente'];
  const DEMO_MODES: readonly Mode[] = ['prospect', 'team'];

  // Simula el montaje de app.ts: tenant resuelto y, en una demo, la marca que deja la guarda.
  const appFor = (mode: Mode, path: string, router: Router): Express => {
    const context: RequestHandler = (_req, res, next) => {
      (res.locals as { tenant?: Tenant }).tenant =
        mode === 'cliente'
          ? new Tenant(TENANT_ID, 'luna', 'Pastelería Luna', null, 'active')
          : tenant;
      if (mode !== 'cliente') {
        markDemoRequest(res, {
          demoId: '018f6f1a-0000-7000-8000-0000000000d1',
          kind: mode,
        });
      }
      next();
    };
    const app = express();
    app.use(express.json());
    app.use(path, context, router);
    app.use(new ErrorHandler().handle);
    return app;
  };

  const settingsRepository = (): GlobalSettingsRepository => ({
    upsert: jest.fn(),
    find: jest.fn().mockResolvedValue(
      GlobalSettings.fromRecord({
        contactEmail: 'duena@pasteleria-luna.cl',
        siteName: 'Pastelería Luna',
      }),
    ),
  });

  describe('formulario de contacto', () => {
    const build = (
      mode: Mode,
    ): {
      app: Express;
      email: jest.Mocked<EmailService>;
      messages: jest.Mocked<ContactMessageRepository>;
    } => {
      const email: jest.Mocked<EmailService> = { sendContactEmail: jest.fn() };
      const messages = {
        save: jest.fn().mockResolvedValue({ id: '018f6f1a-0000-7000-8000-000000000001' }),
        markEmailed: jest.fn(),
      } as unknown as jest.Mocked<ContactMessageRepository>;
      const controller = new ContactController(
        new SendContactEmailUseCase(email, settingsRepository(), messages),
        new RateLimiter(),
      );
      return {
        app: appFor(mode, '/api/contact', createContactRouter(controller)),
        email,
        messages,
      };
    };
    const body = {
      name: 'Prueba',
      email: 'prueba@ejemplo.cl',
      message: 'Hola, ¿hacen tortas?',
    };

    it.each(DEMO_MODES)(
      'en una demo (enlace %s) responde éxito y no sale ningún correo',
      async (mode) => {
        const { app, email, messages } = build(mode);

        const response = await request(app).post('/api/contact').send(body);

        expect(response.status).toBe(200);
        expect((response.body as { success: boolean }).success).toBe(true);
        expect(email.sendContactEmail).not.toHaveBeenCalled();
        expect(messages.markEmailed).toHaveBeenCalledWith(
          '018f6f1a-0000-7000-8000-000000000001',
          'No enviado (Demo)',
        );
      },
    );

    it('en un cliente normal manda el correo como antes', async () => {
      const { app, email } = build('cliente');

      await request(app).post('/api/contact').send(body);

      expect(email.sendContactEmail).toHaveBeenCalled();
    });
  });

  describe('newsletter', () => {
    const build = (
      mode: Mode,
    ): {
      app: Express;
      subscribers: jest.Mocked<NewsletterRepository>;
      consents: jest.Mocked<ConsentRepository>;
    } => {
      const subscribers = {
        subscribe: jest.fn(),
      } as unknown as jest.Mocked<NewsletterRepository>;
      const consents = { record: jest.fn() } as unknown as jest.Mocked<ConsentRepository>;
      const controller = new NewsletterController(
        new SubscribeToNewsletterUseCase(subscribers, consents),
        {} as ListSubscribersUseCase,
        {} as UnsubscribeFromNewsletterUseCase,
        new RateLimiter(),
      );
      return {
        app: appFor(mode, '/api/newsletter', createNewsletterRouter(controller)),
        subscribers,
        consents,
      };
    };

    it.each(DEMO_MODES)(
      'en una demo (enlace %s) responde éxito sin guardar al suscriptor',
      async (mode) => {
        const { app, subscribers, consents } = build(mode);

        const response = await request(app)
          .post('/api/newsletter')
          .send({ email: 'a@b.cl' });

        expect(response.status).toBe(200);
        expect(subscribers.subscribe).not.toHaveBeenCalled();
        expect(consents.record).not.toHaveBeenCalled();
      },
    );

    it('en un cliente normal guarda al suscriptor', async () => {
      const { app, subscribers } = build('cliente');

      await request(app).post('/api/newsletter').send({ email: 'a@b.cl' });

      expect(subscribers.subscribe).toHaveBeenCalled();
    });
  });

  describe('solicitudes de datos personales', () => {
    const build = (
      mode: Mode,
    ): {
      app: Express;
      mailer: jest.Mocked<DataRightsMailer>;
      repository: jest.Mocked<DataRightsRepository>;
    } => {
      const mailer: jest.Mocked<DataRightsMailer> = {
        sendVerification: jest.fn(),
        sendExport: jest.fn(),
        sendErasureDone: jest.fn(),
      };
      const repository = {
        create: jest.fn(),
        findVerifiable: jest.fn().mockResolvedValue({
          tenantId: TENANT_ID,
          request: {
            id: '018f6f1a-0000-7000-8000-000000000002',
            right: 'cancelacion',
            email: 'a@b.cl',
          },
        }),
        markStatus: jest.fn(),
        eraseFor: jest.fn(),
        exportFor: jest.fn(),
      } as unknown as jest.Mocked<DataRightsRepository>;
      const controller = new DataRightsController(
        new SubmitDataRightsRequestUseCase(repository, mailer),
        new VerifyDataRightsRequestUseCase(repository, mailer),
        {} as ListDataRightsRequestsUseCase,
        {} as ResolveDataRightsRequestUseCase,
        new RateLimiter(),
      );
      return {
        app: appFor(mode, '/api/solicitudes-datos', createDataRightsRouter(controller)),
        mailer,
        repository,
      };
    };
    const token = 'a'.repeat(64);

    it.each(DEMO_MODES)(
      'en una demo (enlace %s) responde lo mismo y no manda el correo de verificación',
      async (mode) => {
        const { app, mailer, repository } = build(mode);

        const response = await request(app)
          .post('/api/solicitudes-datos')
          .send({ right: 'acceso', email: 'a@b.cl' });

        expect(response.status).toBe(202);
        expect(mailer.sendVerification).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it.each(DEMO_MODES)(
      'en una demo (enlace %s) confirmar no borra ni escribe a nadie',
      async (mode) => {
        const { app, mailer, repository } = build(mode);

        await request(app).get(`/api/solicitudes-datos/verificar/${token}`);

        expect(repository.eraseFor).not.toHaveBeenCalled();
        expect(mailer.sendErasureDone).not.toHaveBeenCalled();
      },
    );

    it('en un cliente normal confirmar sí borra y avisa (la prueba de la demo no es vacía)', async () => {
      const { app, mailer, repository } = build('cliente');

      await request(app).get(`/api/solicitudes-datos/verificar/${token}`);

      expect(repository.eraseFor).toHaveBeenCalled();
      expect(mailer.sendErasureDone).toHaveBeenCalled();
    });

    it('en un cliente normal manda el correo de verificación', async () => {
      const { app, mailer } = build('cliente');

      await request(app)
        .post('/api/solicitudes-datos')
        .send({ right: 'acceso', email: 'a@b.cl' });

      expect(mailer.sendVerification).toHaveBeenCalled();
    });
  });

  describe('retractos y reclamos', () => {
    const build = (
      mode: Mode,
    ): { app: Express; mailer: jest.Mocked<ConsumerClaimMailer> } => {
      const mailer: jest.Mocked<ConsumerClaimMailer> = {
        notifySeller: jest.fn(),
        sendAcknowledgmentToBuyer: jest.fn(),
      };
      const claims = {
        create: jest
          .fn()
          .mockResolvedValue(
            new ConsumerClaim(
              '018f6f1a-0000-7000-8000-000000000003',
              'reclamo',
              'pendiente',
              null,
              'a@b.cl',
              'La torta llegó tarde',
              new Date(),
            ),
          ),
      } as unknown as ConsumerClaimRepository;
      const controller = new ConsumerClaimController(
        new SubmitConsumerClaimUseCase(
          claims,
          {} as OrderRepository,
          settingsRepository(),
          mailer,
        ),
        {} as ManageConsumerClaimsUseCase,
        new RateLimiter(),
      );
      return {
        app: appFor(mode, '/api/reclamos', createConsumerClaimRouter(controller)),
        mailer,
      };
    };
    const body = { kind: 'reclamo', email: 'a@b.cl', message: 'La torta llegó tarde' };

    it.each(DEMO_MODES)(
      'en una demo (enlace %s) registra el reclamo sin escribirle a nadie',
      async (mode) => {
        const { app, mailer } = build(mode);

        const response = await request(app).post('/api/reclamos').send(body);

        expect(response.status).toBe(201);
        expect(mailer.notifySeller).not.toHaveBeenCalled();
        expect(mailer.sendAcknowledgmentToBuyer).not.toHaveBeenCalled();
      },
    );

    it('en un cliente normal avisa a la dueña y al comprador', async () => {
      const { app, mailer } = build('cliente');

      await request(app).post('/api/reclamos').send(body);

      expect(mailer.notifySeller).toHaveBeenCalled();
      expect(mailer.sendAcknowledgmentToBuyer).toHaveBeenCalled();
    });
  });

  describe('consentimiento de cookies', () => {
    const build = (
      mode: Mode,
    ): { app: Express; consents: jest.Mocked<ConsentRepository> } => {
      const consents = {
        record: jest
          .fn()
          .mockImplementation((_tenantId: string, input: { subject: string }) =>
            Promise.resolve(
              new RecordConsentUseCase({} as ConsentRepository, '').simulate({
                subject: input.subject,
                source: 'cookies',
                purposes: [],
                textVersion: 'v1',
              }),
            ),
          ),
      } as unknown as jest.Mocked<ConsentRepository>;
      const controller = new ConsentController(
        new RecordConsentUseCase(consents, 'sal'),
        {} as GetCurrentConsentUseCase,
        new RateLimiter(),
      );
      return {
        app: appFor(mode, '/api/consents', createConsentRouter(controller)),
        consents,
      };
    };
    const body = {
      subject: 'navegador-123',
      source: 'cookies',
      purposes: ['necessary', 'analytics'],
      textVersion: 'v1',
    };

    it.each(MODES)('responde el consentimiento con la misma forma (%s)', async (mode) => {
      const { app } = build(mode);

      const response = await request(app).post('/api/consents').send(body);

      expect(response.status).toBe(201);
      expect((response.body as { consent: { subject: string } }).consent.subject).toBe(
        'navegador-123',
      );
    });

    it.each(DEMO_MODES)('en una demo (enlace %s) no lo registra', async (mode) => {
      const { app, consents } = build(mode);

      await request(app).post('/api/consents').send(body);

      expect(consents.record).not.toHaveBeenCalled();
    });

    it('en un cliente normal lo registra', async () => {
      const { app, consents } = build('cliente');

      await request(app).post('/api/consents').send(body);

      expect(consents.record).toHaveBeenCalled();
    });
  });

  describe('tienda', () => {
    const PRODUCT_ID = '018f6f1a-0000-7000-8000-000000000005';
    // Flow configurado con credenciales: justo el caso en que una compra de prueba sería grave.
    const settings = new StoreSettings(
      TENANT_ID,
      true,
      'CLP',
      true,
      19,
      [],
      null,
      'flow',
      { apiKey: 'clave-flow-real', secretKey: 'secreto' },
      'duena@pasteleria-luna.cl',
    );

    const build = (
      mode: Mode,
    ): {
      app: Express;
      flow: jest.Mocked<PaymentGateway>;
      mailer: jest.Mocked<OrderMailer>;
      orders: jest.Mocked<OrderRepository>;
    } => {
      const flow = {
        provider: 'flow',
        start: jest.fn().mockResolvedValue({
          reference: 'flow-123',
          redirectUrl: 'https://flow.cl/pagar',
          instructions: null,
        }),
        confirm: jest.fn().mockResolvedValue({ reference: 'flow-123', paid: true }),
      } as unknown as jest.Mocked<PaymentGateway>;
      const mailer: jest.Mocked<OrderMailer> = {
        sendBuyerConfirmation: jest.fn(),
        sendOwnerNotice: jest.fn(),
      };
      const orderFrom = (
        order: NewOrder,
        status: 'pending' | 'paid',
        reference: string | null,
      ): Order =>
        new Order(
          '018f6f1a-0000-7000-8000-000000000004',
          '0001',
          status,
          order.customer,
          order.delivery,
          [],
          order.subtotalCents,
          order.discountCents,
          order.shippingCents,
          order.taxCents,
          order.totalCents,
          order.currency,
          order.couponCode,
          order.paymentProvider,
          reference,
          status === 'paid' ? new Date() : null,
          new Date(),
        );
      let created: NewOrder | null = null;
      const orders = {
        create: jest.fn().mockImplementation((_tenantId: string, order: NewOrder) => {
          created = order;
          return Promise.resolve(orderFrom(order, 'pending', null));
        }),
        setPaymentReference: jest.fn(),
        markPaid: jest
          .fn()
          .mockImplementation((_tenantId: string, _id: string, reference: string) =>
            Promise.resolve(orderFrom(created as unknown as NewOrder, 'paid', reference)),
          ),
        findByPaymentReference: jest.fn(),
        discountStock: jest.fn(),
        markConfirmationEmailed: jest.fn(),
      } as unknown as jest.Mocked<OrderRepository>;
      const storeSettings = {
        find: jest.fn().mockResolvedValue(settings),
      } as unknown as StoreSettingsRepository;
      const products = {
        findById: jest
          .fn()
          .mockResolvedValue(
            new Product(
              PRODUCT_ID,
              'torta',
              'Torta',
              '',
              [],
              20000,
              null,
              'CLP',
              null,
              [],
              true,
              false,
              0,
              null,
            ),
          ),
      } as unknown as ProductRepository;
      const coupons = {
        findByCode: jest.fn(),
        registerUse: jest.fn(),
      } as unknown as CouponRepository;
      const pages = {
        findPublishedAt: jest.fn().mockResolvedValue(null),
      } as unknown as PageRepository;
      // El registro real, con el medio de demostración que arma el contenedor.
      const gateways = new DefaultPaymentGatewayRegistry([
        flow,
        new DemoPaymentGateway(),
      ]);
      const quote = new QuoteCartUseCase(storeSettings, products, coupons);
      const controller = new CheckoutController(
        quote,
        new CheckoutUseCase(quote, orders, gateways, pages),
        new ConfirmPaymentUseCase(storeSettings, orders, coupons, gateways, mailer),
      );
      const passthrough: RequestHandler = (_req, _res, next) => {
        next();
      };
      return {
        app: appFor(mode, '/api/store', createCheckoutRouter(controller, passthrough)),
        flow,
        mailer,
        orders,
      };
    };

    const purchase = {
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
      customer: { name: 'Ana', email: 'ana@ejemplo.cl', phone: '+56911111111' },
      delivery: { method: 'pickup' },
    };

    it.each(DEMO_MODES)(
      'en una demo (enlace %s) con Flow configurado no llama a Flow y el pedido queda pagado con pago simulado',
      async (mode) => {
        const { app, flow, mailer, orders } = build(mode);

        const response = await request(app)
          .post('/api/store/checkout')
          .set('Host', 'demo-luna.webbuilder.co')
          .send(purchase);

        expect(response.status).toBe(201);
        const body = response.body as {
          order: { status: string; paymentProvider: string; paidAt: string | null };
          redirectUrl: string;
          instructions: string | null;
        };
        expect(body.order.status).toBe('paid');
        expect(body.order.paymentProvider).toBe('demo');
        expect(body.order.paidAt).not.toBeNull();
        // La misma URL de retorno que usaría un pago real.
        expect(body.redirectUrl).toBe('http://demo-luna.webbuilder.co/tienda/gracias');
        expect(flow.start).not.toHaveBeenCalled();
        expect(orders.discountStock).not.toHaveBeenCalled();
        expect(mailer.sendBuyerConfirmation).not.toHaveBeenCalled();
        expect(mailer.sendOwnerNotice).not.toHaveBeenCalled();
      },
    );

    it.each(DEMO_MODES)(
      'en una demo (enlace %s) el aviso del proveedor no consulta a Flow ni manda correos',
      async (mode) => {
        const { app, flow, mailer } = build(mode);

        const response = await request(app)
          .post('/api/store/payment-callback')
          .send({ token: 'x' });

        expect(response.body).toEqual({ confirmed: false });
        expect(flow.confirm).not.toHaveBeenCalled();
        expect(mailer.sendBuyerConfirmation).not.toHaveBeenCalled();
      },
    );

    it('en un cliente normal la compra va a Flow como antes', async () => {
      const { app, flow } = build('cliente');

      const response = await request(app).post('/api/store/checkout').send(purchase);

      expect(response.status).toBe(201);
      expect(flow.start).toHaveBeenCalled();
      expect((response.body as { redirectUrl: string }).redirectUrl).toBe(
        'https://flow.cl/pagar',
      );
    });
  });
});

import type { OrderRepository } from '../domain/OrderRepository';
import type { OrderMailer } from '../domain/OrderMailer';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';
import { RetryOrderConfirmationUseCase } from './RetryOrderConfirmationUseCase';
import { StoreSettings } from '../domain/StoreSettings';
import { Order } from '../domain/Order';


describe('RetryOrderConfirmationUseCase', () => {
  it('no hace nada si no hay pedidos pendientes', async () => {
    const orderRepository = {
      findPendingConfirmationEmailed: jest.fn().mockResolvedValue([]),
    } as unknown as OrderRepository;
    const mailer = {} as unknown as OrderMailer;
    const storeSettingsRepository = {} as unknown as StoreSettingsRepository;

    const useCase = new RetryOrderConfirmationUseCase(orderRepository, mailer, storeSettingsRepository);
    const count = await useCase.execute('tenant1', 'Mi Tienda');

    expect(count).toBe(0);
    expect(orderRepository.findPendingConfirmationEmailed).toHaveBeenCalledWith('tenant1');
  });

  it('reintenta el envío de correo de los pedidos pendientes', async () => {
    const order = { id: 'order-1', termsVersion: 1 } as unknown as Order;
    const orderRepository = {
      findPendingConfirmationEmailed: jest.fn().mockResolvedValue([order]),
      markConfirmationEmailed: jest.fn(),
    } as unknown as OrderRepository;
    const mailer = {
      sendBuyerConfirmation: jest.fn(),
    } as unknown as OrderMailer;
    const storeSettings = { seller: null, termsPageSlug: 'terminos' } as unknown as StoreSettings;
    const storeSettingsRepository = {
      find: jest.fn().mockResolvedValue(storeSettings),
    } as unknown as StoreSettingsRepository;

    const useCase = new RetryOrderConfirmationUseCase(orderRepository, mailer, storeSettingsRepository);
    const count = await useCase.execute('tenant1', 'Mi Tienda');

    expect(count).toBe(1);
    expect(mailer.sendBuyerConfirmation).toHaveBeenCalledWith(order, {
      storeName: 'Mi Tienda',
      seller: null,
      termsUrl: '/terminos',
      termsVersion: 1,
    });
    expect(orderRepository.markConfirmationEmailed).toHaveBeenCalledWith(order.id, expect.any(Date), null);
  });

  it('guarda el error si el envío vuelve a fallar', async () => {
    const order = { id: 'order-1', termsVersion: 1 } as unknown as Order;
    const orderRepository = {
      findPendingConfirmationEmailed: jest.fn().mockResolvedValue([order]),
      markConfirmationEmailed: jest.fn(),
    } as unknown as OrderRepository;
    const mailer = {
      sendBuyerConfirmation: jest.fn().mockRejectedValue(new Error('Falla de red')),
    } as unknown as OrderMailer;
    const storeSettings = { seller: null, termsPageSlug: 'terminos' } as unknown as StoreSettings;
    const storeSettingsRepository = {
      find: jest.fn().mockResolvedValue(storeSettings),
    } as unknown as StoreSettingsRepository;

    const useCase = new RetryOrderConfirmationUseCase(orderRepository, mailer, storeSettingsRepository);
    const count = await useCase.execute('tenant1', 'Mi Tienda');

    expect(count).toBe(0);
    expect(orderRepository.markConfirmationEmailed).toHaveBeenCalledWith(order.id, null, 'Falla de red');
  });
});

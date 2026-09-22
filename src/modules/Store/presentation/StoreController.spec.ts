import express, { type Express } from 'express';
import type { RecordSlugChangeUseCase } from '@/modules/Redirect/application/RecordSlugChangeUseCase';
import request from 'supertest';
import { StoreController } from './StoreController';
import { AdminStoreController } from './AdminStoreController';
import { createAdminStoreRouter, createStoreRouter } from './storeRouter';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  ListAllProductsUseCase,
  PublicCatalogUseCase,
  UpdateProductUseCase,
} from '../application/StoreUseCases';
import { Product } from '../domain/Product';
import type { ProductRepository } from '../domain/ProductRepository';
import { GlobalSettings } from '@/modules/GlobalSettings/domain/GlobalSettings';
import type { GlobalSettingsRepository } from '@/modules/GlobalSettings/domain/GlobalSettingsRepository';
import type { StorageProvider } from '@/modules/FileStorage/domain/StorageProvider';
import { Tenant } from '@/modules/Tenant/domain/Tenant';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';

// Las redirecciones por cambio de slug tienen su propio spec; aquí solo estorbarían.
const noSlugChanges = {
  execute: (): Promise<void> => Promise.resolve(),
} as unknown as RecordSlugChangeUseCase;

describe('Tienda (HTTP)', () => {
  const torta = new Product(
    '018f6f1a-0000-7000-8000-000000000001',
    'torta-de-chocolate',
    'Torta de chocolate',
    'Bizcocho con manjar.',
    ['foto.png'],
    29990,
    19990,
    'CLP',
    null,
    [{ name: 'Tamaño', options: ['20 porciones'] }],
    true,
    true,
    0,
  );

  const buildRepository = (): jest.Mocked<ProductRepository> => ({
    listActive: jest.fn().mockResolvedValue({ products: [torta], total: 1 }),
    findActiveBySlug: jest.fn().mockResolvedValue(torta),
    listFeatured: jest.fn().mockResolvedValue([torta]),
    listCategories: jest.fn().mockResolvedValue([]),
    findAllByTenant: jest.fn().mockResolvedValue([torta]),
    findById: jest.fn().mockResolvedValue(torta),
    create: jest.fn().mockResolvedValue(torta),
    update: jest.fn().mockResolvedValue(torta),
    delete: jest.fn().mockResolvedValue(undefined),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  });

  const buildApp = (
    repository: ProductRepository,
    whatsapp = '+56912345678',
  ): Express => {
    const settings: jest.Mocked<GlobalSettingsRepository> = {
      find: jest
        .fn()
        .mockResolvedValue(
          GlobalSettings.fromRecord({ whatsappNumber: whatsapp, siteName: 'Dulce Luna' }),
        ),
    };
    const storage = {
      getPresignedUrl: jest.fn().mockResolvedValue('https://bucket/firmada'),
    } as unknown as StorageProvider;

    const catalog = new PublicCatalogUseCase(repository, settings, storage);
    const publicController = new StoreController(catalog);
    const adminController = new AdminStoreController(
      new ListAllProductsUseCase(repository),
      new CreateProductUseCase(repository),
      new UpdateProductUseCase(repository, noSlugChanges),
      new DeleteProductUseCase(repository),
      repository,
    );

    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      (res.locals as { tenant?: Tenant }).tenant = new Tenant(
        '018f6f1a-0000-7000-8000-000000000009',
        'demo',
        'Demo',
        'demo.cl',
      );
      next();
    });
    app.use('/api/products', createStoreRouter(publicController));
    app.use(
      '/api/admin/tenants/:tenantId/products',
      createAdminStoreRouter(adminController),
    );
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('el catálogo público solo pide productos activos del cliente de la visita', async () => {
    const repository = buildRepository();

    const response = await request(buildApp(repository)).get('/api/products');

    expect(response.status).toBe(200);
    expect(repository.listActive).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000009',
      expect.objectContaining({ page: 1, perPage: 12 }),
    );
  });

  it('cada producto llega con su precio formateado y su enlace de pedido', async () => {
    const response = await request(buildApp(buildRepository())).get('/api/products');
    const producto = (response.body as { products: Record<string, unknown>[] })
      .products[0];

    expect(producto?.price).toContain('19.990');
    expect(producto?.hasDiscount).toBe(true);
    expect(String(producto?.whatsappOrderUrl)).toContain('https://wa.me/56912345678');
  });

  it('las imágenes llegan firmadas, nunca como `key`', async () => {
    const response = await request(buildApp(buildRepository())).get('/api/products');
    const producto = (response.body as { products: { imageUrls: string[] }[] })
      .products[0];

    expect(producto?.imageUrls).toEqual(['https://bucket/firmada']);
  });

  it('sin WhatsApp configurado el enlace de pedido es null, no una URL rota', async () => {
    const response = await request(buildApp(buildRepository(), '')).get('/api/products');
    const producto = (response.body as { products: { whatsappOrderUrl: null }[] })
      .products[0];

    expect(producto?.whatsappOrderUrl).toBeNull();
  });

  it('un producto inactivo no existe para el visitante, aunque adivine su dirección', async () => {
    const repository = buildRepository();
    repository.findActiveBySlug.mockResolvedValue(null);

    const response = await request(buildApp(repository)).get('/api/products/oculto');

    expect(response.status).toBe(404);
  });

  it('el filtro de búsqueda y de categoría llegan al repositorio', async () => {
    const repository = buildRepository();

    await request(buildApp(repository)).get('/api/products?search=torta&category=tortas');

    expect(repository.listActive).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000009',
      expect.objectContaining({ search: 'torta', categorySlug: 'tortas' }),
    );
  });

  it('el listado de administración sí incluye los inactivos', async () => {
    const repository = buildRepository();

    const response = await request(buildApp(repository)).get(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000009/products',
    );

    expect(response.status).toBe(200);
    expect(repository.findAllByTenant).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000009',
    );
  });

  it('crear un producto con una oferta más cara que el precio normal es error de petición', async () => {
    const response = await request(buildApp(buildRepository()))
      .post('/api/admin/tenants/018f6f1a-0000-7000-8000-000000000009/products')
      .send({
        slug: 'torta',
        name: 'Torta',
        priceCents: 10000,
        salePriceCents: 12000,
      });

    expect(response.status).toBe(400);
  });

  it('crear un producto con precio negativo es error de petición', async () => {
    const response = await request(buildApp(buildRepository()))
      .post('/api/admin/tenants/018f6f1a-0000-7000-8000-000000000009/products')
      .send({ slug: 'torta', name: 'Torta', priceCents: -5 });

    expect(response.status).toBe(400);
  });
});

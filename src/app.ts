import express, { type Express, type RequestHandler } from 'express';
import cors from 'cors';
import { buildOriginMatcher } from './shared/presentation/corsOrigins';
import type { PageController } from './modules/Page/presentation/PageController';
import { createPageRouter } from './modules/Page/presentation/pageRouter';
import type { GlobalSettingsController } from './modules/GlobalSettings/presentation/GlobalSettingsController';
import { createGlobalSettingsRouter } from './modules/GlobalSettings/presentation/globalSettingsRouter';
import type { NavigationController } from './modules/Navigation/presentation/NavigationController';
import type { AdminNavigationController } from './modules/Navigation/presentation/AdminNavigationController';
import { createAdminNavigationRouter } from './modules/Navigation/presentation/adminNavigationRouter';
import { createNavigationRouter } from './modules/Navigation/presentation/navigationRouter';
import type { ContactController } from './modules/Contact/presentation/ContactController';
import { createContactRouter } from './modules/Contact/presentation/contactRouter';
import type { FileController } from './modules/FileStorage/presentation/FileController';
import { createFileRouter } from './modules/FileStorage/presentation/fileRouter';
import type { TenantController } from './modules/Tenant/presentation/TenantController';
import { siteAvailability } from './modules/Tenant/presentation/siteAvailability';
import { createTenantInternalRouter } from './modules/Tenant/presentation/tenantRouter';
import type { AuthController } from './modules/Auth/presentation/AuthController';
import type { AdminUserController } from './modules/Auth/presentation/AdminUserController';
import { createAdminUserRouter } from './modules/Auth/presentation/adminUserRouter';
import { createAuthRouter } from './modules/Auth/presentation/authRouter';
import type { AdminTenantController } from './modules/Tenant/presentation/AdminTenantController';
import { createAdminTenantRouter } from './modules/Tenant/presentation/adminTenantRouter';
import type { AdminPageController } from './modules/Page/presentation/AdminPageController';
import { createAdminPageRouter } from './modules/Page/presentation/adminPageRouter';
import type { ApiKeyController } from './modules/ApiKey/presentation/ApiKeyController';
import { createApiKeyRouter } from './modules/ApiKey/presentation/apiKeyRouter';
import {
  requireMethodPermission,
  requireRole,
  requireStaff,
  requireTenantScope,
} from './modules/ApiKey/presentation/actorMiddleware';
import type { AdminContactMessageController } from './modules/Contact/presentation/AdminContactMessageController';
import { createAdminContactMessageRouter } from './modules/Contact/presentation/adminContactMessageRouter';
import type { MediaController } from './modules/FileStorage/presentation/MediaController';
import { createMediaRouter } from './modules/FileStorage/presentation/mediaRouter';
import type { StoreController } from './modules/Store/presentation/StoreController';
import type { AdminStoreController } from './modules/Store/presentation/AdminStoreController';
import type { CheckoutController } from './modules/Store/presentation/CheckoutController';
import type { AdminOrderController } from './modules/Store/presentation/AdminOrderController';
import {
  createAdminOrderRouter,
  createCheckoutRouter,
} from './modules/Store/presentation/checkoutRouter';
import {
  createAdminStoreRouter,
  createProductCategoryRouter,
  createStoreRouter,
} from './modules/Store/presentation/storeRouter';
import type { BlogController } from './modules/Blog/presentation/BlogController';
import type { AdminBlogController } from './modules/Blog/presentation/AdminBlogController';
import {
  createAdminBlogRouter,
  createBlogRouter,
} from './modules/Blog/presentation/blogRouter';
import type { NewsletterController } from './modules/Newsletter/presentation/NewsletterController';
import {
  createAdminNewsletterRouter,
  createNewsletterRouter,
} from './modules/Newsletter/presentation/newsletterRouter';
import type { LegalPageController } from './modules/LegalPages/presentation/LegalPageController';
import type { CatalogController } from './modules/Catalog/presentation/CatalogController';
import type { ActivityLogController } from './modules/ActivityLog/presentation/ActivityLogController';
import { createActivityLogRouter } from './modules/ActivityLog/presentation/activityLogRouter';
import type { AdminBrandController } from './modules/Brand/presentation/AdminBrandController';
import { createAdminBrandRouter } from './modules/Brand/presentation/adminBrandRouter';
import { ErrorHandler } from './shared/presentation/ErrorHandler';

export interface AppControllers {
  readonly pageController: PageController;
  readonly globalSettingsController: GlobalSettingsController;
  readonly navigationController: NavigationController;
  readonly adminNavigationController: AdminNavigationController;
  readonly contactController: ContactController;
  readonly fileController: FileController;
  readonly tenantController: TenantController;
  readonly authController: AuthController;
  readonly adminUserController: AdminUserController;
  readonly adminTenantController: AdminTenantController;
  readonly adminPageController: AdminPageController;
  readonly adminBrandController: AdminBrandController;
  readonly apiKeyController: ApiKeyController;
  readonly activityLogController: ActivityLogController;
  readonly catalogController: CatalogController;
  readonly adminContactMessageController: AdminContactMessageController;
  readonly legalPageController: LegalPageController;
  readonly newsletterController: NewsletterController;
  readonly mediaController: MediaController;
  readonly blogController: BlogController;
  readonly adminBlogController: AdminBlogController;
  readonly storeController: StoreController;
  readonly adminStoreController: AdminStoreController;
  readonly checkoutController: CheckoutController;
  readonly adminOrderController: AdminOrderController;
}

export const buildApp = (
  controllers: AppControllers,
  corsOrigin: string[],
  fileUploadMiddleware: RequestHandler,
  tenantResolver: RequestHandler,
  actorMiddleware: RequestHandler,
  cacheInvalidation: RequestHandler,
  activityRecording: RequestHandler,
  // Sin clave de idempotencia la compra se comporta igual; por defecto no hace nada.
  checkoutIdempotency: RequestHandler = (_req, _res, next) => {
    next();
  },
): Express => {
  const app = express();
  const errorHandler = new ErrorHandler();

  const isAllowedOrigin = buildOriginMatcher(corsOrigin);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Sin `Origin` es una llamada del mismo sitio o de servidor a servidor: CORS no aplica.
        callback(null, origin === undefined || isAllowedOrigin(origin));
      },
    }),
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Capa de borde (Caddy), no el frontend: no lleva prefijo /api y no debe
  // publicarse a internet. Ver createTenantInternalRouter.
  app.use('/internal', createTenantInternalRouter(controllers.tenantController));

  // Rutas scoped por tenant: el resolver deja el tenant en res.locals.
  app.use(
    '/api/pages',
    tenantResolver,
    siteAvailability,
    createPageRouter(controllers.pageController),
  );
  app.use(
    '/api/settings',
    tenantResolver,
    siteAvailability,
    createGlobalSettingsRouter(controllers.globalSettingsController),
  );
  app.use(
    '/api/navigation',
    tenantResolver,
    siteAvailability,
    createNavigationRouter(controllers.navigationController),
  );
  app.use(
    '/api/contact',
    tenantResolver,
    siteAvailability,
    createContactRouter(controllers.contactController),
  );
  // Subir y borrar exige sesión (SPEC 0.1); leer imágenes sigue siendo público.
  app.use(
    '/api/blog',
    tenantResolver,
    siteAvailability,
    createBlogRouter(controllers.blogController),
  );
  app.use(
    '/api/products',
    tenantResolver,
    siteAvailability,
    createStoreRouter(controllers.storeController),
  );
  app.use(
    '/api/store',
    tenantResolver,
    siteAvailability,
    createCheckoutRouter(controllers.checkoutController, checkoutIdempotency),
  );
  app.use(
    '/api/product-categories',
    tenantResolver,
    siteAvailability,
    createProductCategoryRouter(controllers.storeController),
  );
  app.use(
    '/api/newsletter',
    tenantResolver,
    siteAvailability,
    createNewsletterRouter(controllers.newsletterController),
  );
  app.use(
    '/api/files',
    actorMiddleware,
    requireMethodPermission,
    activityRecording,
    createFileRouter(controllers.fileController, fileUploadMiddleware),
  );

  // Auth: /login es público (sería absurdo protegerlo con el propio token
  // que emite); /me exige sesión válida, como cualquier ruta admin futura.
  app.use('/api/admin/auth', createAuthRouter(controllers.authController));
  app.get('/api/admin/me', actorMiddleware, controllers.authController.me);

  // Panel y agentes comparten estas rutas: mismas validaciones, mismos permisos,
  // mismo registro de actividad. Es lo que exige el principio de la Épica 10.
  const adminGuards: RequestHandler[] = [
    actorMiddleware,
    requireTenantScope,
    requireMethodPermission,
    activityRecording,
  ];

  // Resto de /api/admin/**: mismo middleware, scoped por :tenantId en la ruta
  // (no por dominio — un admin gestiona todos los tenants desde un login).
  // Emitir claves y administrar personas son las dos formas de repartir acceso: ambas
  // quedan detrás de `requireRole('owner')`, y una clave de agente nunca pasa (rol null).
  app.use(
    '/api/admin/api-keys',
    actorMiddleware,
    requireRole('owner'),
    activityRecording,
    createApiKeyRouter(controllers.apiKeyController),
  );
  app.use(
    '/api/admin/users',
    actorMiddleware,
    requireRole('owner'),
    activityRecording,
    createAdminUserRouter(controllers.adminUserController),
  );
  app.use(
    '/api/admin/activity',
    actorMiddleware,
    createActivityLogRouter(controllers.activityLogController),
  );
  app.get('/api/admin/catalog', actorMiddleware, controllers.catalogController.get);
  app.get(
    '/api/admin/site-templates',
    actorMiddleware,
    controllers.adminTenantController.listTemplates,
  );
  app.get(
    '/api/admin/legal-templates',
    actorMiddleware,
    controllers.legalPageController.list,
  );
  app.post(
    '/api/admin/tenants/:tenantId/legal-pages',
    ...adminGuards,
    cacheInvalidation,
    controllers.legalPageController.create,
  );
  app.use(
    '/api/admin/tenants/:tenantId/products',
    ...adminGuards,
    cacheInvalidation,
    createAdminStoreRouter(controllers.adminStoreController),
  );
  app.use(
    '/api/admin/tenants/:tenantId/navigation',
    ...adminGuards,
    cacheInvalidation,
    createAdminNavigationRouter(controllers.adminNavigationController),
  );
  app.use(
    '/api/admin/tenants/:tenantId/store',
    ...adminGuards,
    cacheInvalidation,
    createAdminOrderRouter(controllers.adminOrderController),
  );
  app.use(
    '/api/admin/tenants/:tenantId/posts',
    ...adminGuards,
    cacheInvalidation,
    createAdminBlogRouter(controllers.adminBlogController),
  );
  app.use(
    '/api/admin/tenants/:tenantId/media',
    ...adminGuards,
    createMediaRouter(controllers.mediaController, fileUploadMiddleware),
  );
  app.use(
    '/api/admin/tenants/:tenantId/subscribers',
    ...adminGuards,
    createAdminNewsletterRouter(controllers.newsletterController),
  );
  app.use(
    '/api/admin/tenants/:tenantId/messages',
    ...adminGuards,
    createAdminContactMessageRouter(controllers.adminContactMessageController),
  );

  app.use(
    '/api/admin/tenants',
    ...adminGuards,
    createAdminTenantRouter(controllers.adminTenantController, requireStaff),
  );
  // `cacheInvalidation` aquí y no en cada caso de uso: cubre toda ruta admin futura (SPEC 0.2).
  app.use(
    '/api/admin/tenants/:tenantId/pages',
    ...adminGuards,
    cacheInvalidation,
    createAdminPageRouter(controllers.adminPageController),
  );
  app.use(
    '/api/admin/tenants/:tenantId/brand',
    ...adminGuards,
    cacheInvalidation,
    createAdminBrandRouter(controllers.adminBrandController),
  );
  app.get(
    '/api/admin/font-pairings',
    actorMiddleware,
    controllers.adminBrandController.listFontPairings,
  );

  app.use(errorHandler.handle);

  return app;
};

import express, { type Express, type RequestHandler } from 'express';
import cors from 'cors';
import type { PageController } from './modules/Page/presentation/PageController';
import { createPageRouter } from './modules/Page/presentation/pageRouter';
import type { GlobalSettingsController } from './modules/GlobalSettings/presentation/GlobalSettingsController';
import { createGlobalSettingsRouter } from './modules/GlobalSettings/presentation/globalSettingsRouter';
import type { NavigationController } from './modules/Navigation/presentation/NavigationController';
import { createNavigationRouter } from './modules/Navigation/presentation/navigationRouter';
import type { ContactController } from './modules/Contact/presentation/ContactController';
import { createContactRouter } from './modules/Contact/presentation/contactRouter';
import type { FileController } from './modules/FileStorage/presentation/FileController';
import { createFileRouter } from './modules/FileStorage/presentation/fileRouter';
import type { TenantController } from './modules/Tenant/presentation/TenantController';
import { createTenantInternalRouter } from './modules/Tenant/presentation/tenantRouter';
import type { AuthController } from './modules/Auth/presentation/AuthController';
import { createAuthRouter } from './modules/Auth/presentation/authRouter';
import type { AdminTenantController } from './modules/Tenant/presentation/AdminTenantController';
import { createAdminTenantRouter } from './modules/Tenant/presentation/adminTenantRouter';
import type { AdminPageController } from './modules/Page/presentation/AdminPageController';
import { createAdminPageRouter } from './modules/Page/presentation/adminPageRouter';
import type { AdminBrandController } from './modules/Brand/presentation/AdminBrandController';
import { createAdminBrandRouter } from './modules/Brand/presentation/adminBrandRouter';
import { ErrorHandler } from './shared/presentation/ErrorHandler';

export interface AppControllers {
  readonly pageController: PageController;
  readonly globalSettingsController: GlobalSettingsController;
  readonly navigationController: NavigationController;
  readonly contactController: ContactController;
  readonly fileController: FileController;
  readonly tenantController: TenantController;
  readonly authController: AuthController;
  readonly adminTenantController: AdminTenantController;
  readonly adminPageController: AdminPageController;
  readonly adminBrandController: AdminBrandController;
}

export const buildApp = (
  controllers: AppControllers,
  corsOrigin: string[],
  fileUploadMiddleware: RequestHandler,
  tenantResolver: RequestHandler,
  adminAuthMiddleware: RequestHandler,
  cacheInvalidation: RequestHandler,
): Express => {
  const app = express();
  const errorHandler = new ErrorHandler();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Capa de borde (Caddy), no el frontend: no lleva prefijo /api y no debe
  // publicarse a internet. Ver createTenantInternalRouter.
  app.use('/internal', createTenantInternalRouter(controllers.tenantController));

  // Rutas scoped por tenant: el resolver deja el tenant en res.locals.
  app.use('/api/pages', tenantResolver, createPageRouter(controllers.pageController));
  app.use(
    '/api/settings',
    tenantResolver,
    createGlobalSettingsRouter(controllers.globalSettingsController),
  );
  app.use(
    '/api/navigation',
    tenantResolver,
    createNavigationRouter(controllers.navigationController),
  );
  app.use(
    '/api/contact',
    tenantResolver,
    createContactRouter(controllers.contactController),
  );
  // Subir y borrar exige sesión (SPEC 0.1); leer imágenes sigue siendo público.
  app.use(
    '/api/files',
    adminAuthMiddleware,
    createFileRouter(controllers.fileController, fileUploadMiddleware),
  );

  // Auth: /login es público (sería absurdo protegerlo con el propio token
  // que emite); /me exige sesión válida, como cualquier ruta admin futura.
  app.use('/api/admin/auth', createAuthRouter(controllers.authController));
  app.get('/api/admin/me', adminAuthMiddleware, controllers.authController.me);

  // Resto de /api/admin/**: mismo middleware, scoped por :tenantId en la ruta
  // (no por dominio — un admin gestiona todos los tenants desde un login).
  app.use(
    '/api/admin/tenants',
    adminAuthMiddleware,
    createAdminTenantRouter(controllers.adminTenantController),
  );
  // `cacheInvalidation` aquí y no en cada caso de uso: cubre toda ruta admin futura (SPEC 0.2).
  app.use(
    '/api/admin/tenants/:tenantId/pages',
    adminAuthMiddleware,
    cacheInvalidation,
    createAdminPageRouter(controllers.adminPageController),
  );
  app.use(
    '/api/admin/tenants/:tenantId/brand',
    adminAuthMiddleware,
    cacheInvalidation,
    createAdminBrandRouter(controllers.adminBrandController),
  );
  app.get(
    '/api/admin/font-pairings',
    adminAuthMiddleware,
    controllers.adminBrandController.listFontPairings,
  );

  app.use(errorHandler.handle);

  return app;
};

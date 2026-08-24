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
import { ErrorHandler } from './shared/presentation/ErrorHandler';

export interface AppControllers {
  readonly pageController: PageController;
  readonly globalSettingsController: GlobalSettingsController;
  readonly navigationController: NavigationController;
  readonly contactController: ContactController;
  readonly fileController: FileController;
  readonly tenantController: TenantController;
}

export const buildApp = (
  controllers: AppControllers,
  corsOrigin: string[],
  fileUploadMiddleware: RequestHandler,
  tenantResolver: RequestHandler,
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
  app.use(
    '/api/files',
    createFileRouter(controllers.fileController, fileUploadMiddleware),
  );

  app.use(errorHandler.handle);

  return app;
};

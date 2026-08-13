import express, { type Express } from 'express';
import cors from 'cors';
import type { PageController } from './modules/Page/presentation/PageController';
import { createPageRouter } from './modules/Page/presentation/pageRouter';
import type { GlobalSettingsController } from './modules/GlobalSettings/presentation/GlobalSettingsController';
import { createGlobalSettingsRouter } from './modules/GlobalSettings/presentation/globalSettingsRouter';
import type { NavigationController } from './modules/Navigation/presentation/NavigationController';
import { createNavigationRouter } from './modules/Navigation/presentation/navigationRouter';
import type { ContactController } from './modules/Contact/presentation/ContactController';
import { createContactRouter } from './modules/Contact/presentation/contactRouter';
import { ErrorHandler } from './shared/presentation/ErrorHandler';

export interface AppControllers {
  readonly pageController: PageController;
  readonly globalSettingsController: GlobalSettingsController;
  readonly navigationController: NavigationController;
  readonly contactController: ContactController;
}

export const buildApp = (controllers: AppControllers, corsOrigin: string): Express => {
  const app = express();
  const errorHandler = new ErrorHandler();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/pages', createPageRouter(controllers.pageController));
  app.use(
    '/api/settings',
    createGlobalSettingsRouter(controllers.globalSettingsController),
  );
  app.use('/api/navigation', createNavigationRouter(controllers.navigationController));
  app.use('/api/contact', createContactRouter(controllers.contactController));

  app.use(errorHandler.handle);

  return app;
};

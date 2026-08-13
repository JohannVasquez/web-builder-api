import type { Express } from 'express';
import { ContainerBuilder, type Container as ServiceContainer } from 'diod';
import type { EnvConfig } from './shared/config/EnvConfig';
import { PrismaConnection } from './shared/infrastructure/database/PrismaConnection';
import { PrismaClient } from './shared/infrastructure/prisma/generated/client';
import { PageRepository } from './modules/Page/domain/PageRepository';
import { PrismaPageRepository } from './modules/Page/infrastructure/PrismaPageRepository';
import { GetPageBySlugUseCase } from './modules/Page/application/GetPageBySlugUseCase';
import { PageController } from './modules/Page/presentation/PageController';
import { GlobalSettingsRepository } from './modules/GlobalSettings/domain/GlobalSettingsRepository';
import { PrismaGlobalSettingsRepository } from './modules/GlobalSettings/infrastructure/PrismaGlobalSettingsRepository';
import { GetGlobalSettingsUseCase } from './modules/GlobalSettings/application/GetGlobalSettingsUseCase';
import { GlobalSettingsController } from './modules/GlobalSettings/presentation/GlobalSettingsController';
import { NavigationRepository } from './modules/Navigation/domain/NavigationRepository';
import { PrismaNavigationRepository } from './modules/Navigation/infrastructure/PrismaNavigationRepository';
import { GetNavigationUseCase } from './modules/Navigation/application/GetNavigationUseCase';
import { NavigationController } from './modules/Navigation/presentation/NavigationController';
import { EmailService } from './modules/Contact/domain/EmailService';
import {
  SmtpEmailService,
  SmtpConfig,
} from './modules/Contact/infrastructure/SmtpEmailService';
import { SendContactEmailUseCase } from './modules/Contact/application/SendContactEmailUseCase';
import { ContactController } from './modules/Contact/presentation/ContactController';
import { buildApp } from './app';

/**
 * Registra todos los servicios en el contenedor de diod. Este es el único
 * lugar de la aplicación donde las abstracciones de `domain` se acoplan a
 * sus implementaciones concretas de `infrastructure`.
 *
 * Las dependencias se declaran explícitamente con `withDependencies` en vez
 * de depender del autowiring por decoradores (`@Service()` + reflect-metadata):
 * ese modo requiere `emitDecoratorMetadata`, que necesita chequeo de tipos de
 * todo el `Program` para resolver referencias de clases entre archivos. Los
 * transpiladores de un solo archivo como esbuild (usado por `tsx` en `pnpm dev`)
 * no tienen esa información y generan metadata incompleta. El wiring explícito
 * es una característica de diod de primera clase, sin esa dependencia frágil.
 */
const buildServiceContainer = (env: EnvConfig): ServiceContainer => {
  const builder = new ContainerBuilder();

  // Valores construidos manualmente a partir de variables de entorno.
  builder
    .register(PrismaConnection)
    .useFactory(() => new PrismaConnection(env.get('DATABASE_URL')))
    .asSingleton();
  builder
    .register(PrismaClient)
    .useFactory((container) => container.get(PrismaConnection).getClient())
    .asSingleton();
  builder
    .register(SmtpConfig)
    .useFactory(
      () =>
        new SmtpConfig(
          env.get('SMTP_HOST'),
          env.get('SMTP_PORT'),
          env.get('SMTP_SECURE'),
          env.get('SMTP_USER'),
          env.get('SMTP_PASS'),
          env.get('CONTACT_EMAIL_FROM'),
          env.get('CONTACT_EMAIL_TO'),
        ),
    )
    .asSingleton();

  // Page
  builder
    .register(PageRepository)
    .use(PrismaPageRepository)
    .withDependencies([PrismaClient]);
  builder.registerAndUse(GetPageBySlugUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(PageController).withDependencies([GetPageBySlugUseCase]);

  // GlobalSettings
  builder
    .register(GlobalSettingsRepository)
    .use(PrismaGlobalSettingsRepository)
    .withDependencies([PrismaClient]);
  builder
    .registerAndUse(GetGlobalSettingsUseCase)
    .withDependencies([GlobalSettingsRepository]);
  builder
    .registerAndUse(GlobalSettingsController)
    .withDependencies([GetGlobalSettingsUseCase]);

  // Navigation
  builder
    .register(NavigationRepository)
    .use(PrismaNavigationRepository)
    .withDependencies([PrismaClient]);
  builder.registerAndUse(GetNavigationUseCase).withDependencies([NavigationRepository]);
  builder.registerAndUse(NavigationController).withDependencies([GetNavigationUseCase]);

  // Contact
  builder.register(EmailService).use(SmtpEmailService).withDependencies([SmtpConfig]);
  builder.registerAndUse(SendContactEmailUseCase).withDependencies([EmailService]);
  builder.registerAndUse(ContactController).withDependencies([SendContactEmailUseCase]);

  return builder.build();
};

export class Container {
  private readonly services: ServiceContainer;
  private readonly app: Express;

  constructor(env: EnvConfig) {
    this.services = buildServiceContainer(env);

    this.app = buildApp(
      {
        pageController: this.services.get(PageController),
        globalSettingsController: this.services.get(GlobalSettingsController),
        navigationController: this.services.get(NavigationController),
        contactController: this.services.get(ContactController),
      },
      env.get('CORS_ORIGIN'),
    );
  }

  public getApp(): Express {
    return this.app;
  }

  public async dispose(): Promise<void> {
    await this.services.get(PrismaConnection).close();
  }
}

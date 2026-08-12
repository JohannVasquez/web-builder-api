import type { Express } from 'express';
import type { EnvConfig } from './shared/config/EnvConfig';
import { PrismaConnection } from './shared/infrastructure/database/PrismaConnection';
import { PrismaPageRepository } from './modules/Page/infrastructure/PrismaPageRepository';
import { GetPageBySlugUseCase } from './modules/Page/application/GetPageBySlugUseCase';
import { PageController } from './modules/Page/presentation/PageController';
import { PrismaGlobalSettingsRepository } from './modules/GlobalSettings/infrastructure/PrismaGlobalSettingsRepository';
import { GetGlobalSettingsUseCase } from './modules/GlobalSettings/application/GetGlobalSettingsUseCase';
import { GlobalSettingsController } from './modules/GlobalSettings/presentation/GlobalSettingsController';
import { SmtpEmailService } from './modules/Contact/infrastructure/SmtpEmailService';
import { SendContactEmailUseCase } from './modules/Contact/application/SendContactEmailUseCase';
import { ContactController } from './modules/Contact/presentation/ContactController';
import { buildApp } from './app';

export class Container {
  private readonly connection: PrismaConnection;
  private readonly app: Express;

  constructor(env: EnvConfig) {
    this.connection = new PrismaConnection(env.get('DATABASE_URL'));
    const prisma = this.connection.getClient();

    const pageController = new PageController(
      new GetPageBySlugUseCase(new PrismaPageRepository(prisma)),
    );
    const globalSettingsController = new GlobalSettingsController(
      new GetGlobalSettingsUseCase(new PrismaGlobalSettingsRepository(prisma)),
    );
    const contactController = new ContactController(
      new SendContactEmailUseCase(
        new SmtpEmailService({
          host: env.get('SMTP_HOST'),
          port: env.get('SMTP_PORT'),
          secure: env.get('SMTP_SECURE'),
          user: env.get('SMTP_USER'),
          pass: env.get('SMTP_PASS'),
          from: env.get('CONTACT_EMAIL_FROM'),
          to: env.get('CONTACT_EMAIL_TO'),
        }),
      ),
    );

    this.app = buildApp(
      { pageController, globalSettingsController, contactController },
      env.get('CORS_ORIGIN'),
    );
  }

  public getApp(): Express {
    return this.app;
  }

  public async dispose(): Promise<void> {
    await this.connection.close();
  }
}

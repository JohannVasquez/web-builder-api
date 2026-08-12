import type { Express } from 'express';
import type { EnvConfig } from './shared/config/EnvConfig';
import { PostgresConnection } from './shared/infrastructure/database/PostgresConnection';
import { PostgresPageRepository } from './modules/Page/infrastructure/PostgresPageRepository';
import { GetPageBySlugUseCase } from './modules/Page/application/GetPageBySlugUseCase';
import { PageController } from './modules/Page/presentation/PageController';
import { PostgresGlobalSettingsRepository } from './modules/GlobalSettings/infrastructure/PostgresGlobalSettingsRepository';
import { GetGlobalSettingsUseCase } from './modules/GlobalSettings/application/GetGlobalSettingsUseCase';
import { GlobalSettingsController } from './modules/GlobalSettings/presentation/GlobalSettingsController';
import { SmtpEmailService } from './modules/Contact/infrastructure/SmtpEmailService';
import { SendContactEmailUseCase } from './modules/Contact/application/SendContactEmailUseCase';
import { ContactController } from './modules/Contact/presentation/ContactController';
import { buildApp } from './app';

export class Container {
  private readonly connection: PostgresConnection;
  private readonly app: Express;

  constructor(env: EnvConfig) {
    this.connection = new PostgresConnection(env.get('DATABASE_URL'));
    const pool = this.connection.getPool();

    const pageController = new PageController(
      new GetPageBySlugUseCase(new PostgresPageRepository(pool)),
    );
    const globalSettingsController = new GlobalSettingsController(
      new GetGlobalSettingsUseCase(new PostgresGlobalSettingsRepository(pool)),
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

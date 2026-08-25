import type { Express } from 'express';
import { ContainerBuilder, type Container as ServiceContainer } from 'diod';
import type { EnvConfig } from './shared/config/EnvConfig';
import { PrismaConnection } from './shared/infrastructure/database/PrismaConnection';
import { PrismaClient } from './shared/infrastructure/prisma/generated/client';
import { PageRepository } from './modules/Page/domain/PageRepository';
import { PrismaPageRepository } from './modules/Page/infrastructure/PrismaPageRepository';
import { GetPageBySlugUseCase } from './modules/Page/application/GetPageBySlugUseCase';
import { ListPagesUseCase } from './modules/Page/application/ListPagesUseCase';
import { GetPageByIdUseCase } from './modules/Page/application/GetPageByIdUseCase';
import { CreatePageUseCase } from './modules/Page/application/CreatePageUseCase';
import { UpdatePageUseCase } from './modules/Page/application/UpdatePageUseCase';
import { DeletePageUseCase } from './modules/Page/application/DeletePageUseCase';
import { AddSectionUseCase } from './modules/Page/application/AddSectionUseCase';
import { UpdateSectionUseCase } from './modules/Page/application/UpdateSectionUseCase';
import { DeleteSectionUseCase } from './modules/Page/application/DeleteSectionUseCase';
import { ReorderSectionsUseCase } from './modules/Page/application/ReorderSectionsUseCase';
import { PageController } from './modules/Page/presentation/PageController';
import { AdminPageController } from './modules/Page/presentation/AdminPageController';
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
import { TenantRepository } from './modules/Tenant/domain/TenantRepository';
import { PrismaTenantRepository } from './modules/Tenant/infrastructure/PrismaTenantRepository';
import { ResolveTenantUseCase } from './modules/Tenant/application/ResolveTenantUseCase';
import { IsDomainAllowedUseCase } from './modules/Tenant/application/IsDomainAllowedUseCase';
import { ListTenantsUseCase } from './modules/Tenant/application/ListTenantsUseCase';
import { TenantController } from './modules/Tenant/presentation/TenantController';
import { AdminTenantController } from './modules/Tenant/presentation/AdminTenantController';
import { createTenantResolver } from './modules/Tenant/presentation/tenantResolver';
import { StorageProvider } from './modules/FileStorage/domain/StorageProvider';
import { StorageAssetRepository } from './modules/FileStorage/domain/StorageAssetRepository';
import { FileStorageConfig } from './modules/FileStorage/domain/FileStorageConfig';
import {
  S3CompatibleStorageProvider,
  S3StorageConfig,
} from './modules/FileStorage/infrastructure/S3CompatibleStorageProvider';
import { PrismaStorageAssetRepository } from './modules/FileStorage/infrastructure/PrismaStorageAssetRepository';
import { createFileUploadMiddleware } from './modules/FileStorage/infrastructure/multerConfig';
import { UploadFileUseCase } from './modules/FileStorage/application/UploadFileUseCase';
import { DeleteFileUseCase } from './modules/FileStorage/application/DeleteFileUseCase';
import { ResolveImageUrlsUseCase } from './modules/FileStorage/application/ResolveImageUrlsUseCase';
import { FileController } from './modules/FileStorage/presentation/FileController';
import { AdminUserRepository } from './modules/Auth/domain/AdminUserRepository';
import { PasswordHasher } from './modules/Auth/domain/PasswordHasher';
import { TokenService } from './modules/Auth/domain/TokenService';
import { PrismaAdminUserRepository } from './modules/Auth/infrastructure/PrismaAdminUserRepository';
import { ScryptPasswordHasher } from './modules/Auth/infrastructure/ScryptPasswordHasher';
import {
  JwtConfig,
  JwtTokenService,
} from './modules/Auth/infrastructure/JwtTokenService';
import { LoginUseCase } from './modules/Auth/application/LoginUseCase';
import { VerifyTokenUseCase } from './modules/Auth/application/VerifyTokenUseCase';
import { AuthController } from './modules/Auth/presentation/AuthController';
import { createAdminAuthMiddleware } from './modules/Auth/presentation/adminAuthMiddleware';
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

  // Tenant
  builder
    .register(TenantRepository)
    .use(PrismaTenantRepository)
    .withDependencies([PrismaClient]);
  builder.registerAndUse(ResolveTenantUseCase).withDependencies([TenantRepository]);
  builder.registerAndUse(IsDomainAllowedUseCase).withDependencies([TenantRepository]);
  builder.registerAndUse(TenantController).withDependencies([IsDomainAllowedUseCase]);
  builder.registerAndUse(ListTenantsUseCase).withDependencies([TenantRepository]);
  builder.registerAndUse(AdminTenantController).withDependencies([ListTenantsUseCase]);

  // FileStorage: MinIO (dev) y Cloudflare R2 (prod) hablan ambos el protocolo
  // S3, así que STORAGE_DRIVER solo ajusta la configuración del mismo
  // S3CompatibleStorageProvider (MinIO exige URLs path-style). El bucket es
  // privado en los dos: no hay URL pública, solo `getPresignedUrl`. Va antes
  // que Page porque GetPageBySlugUseCase depende de ResolveImageUrlsUseCase.
  builder
    .register(S3StorageConfig)
    .useFactory(
      () =>
        new S3StorageConfig(
          env.get('STORAGE_ENDPOINT'),
          env.get('STORAGE_REGION'),
          env.get('STORAGE_BUCKET'),
          env.get('STORAGE_ACCESS_KEY'),
          env.get('STORAGE_SECRET_KEY'),
          env.get('STORAGE_DRIVER') === 'minio',
        ),
    )
    .asSingleton();
  builder
    .register(FileStorageConfig)
    .useFactory(() => new FileStorageConfig(env.get('MAX_FILE_SIZE_MB') * 1024 * 1024))
    .asSingleton();
  builder
    .register(StorageProvider)
    .use(S3CompatibleStorageProvider)
    .withDependencies([S3StorageConfig]);
  builder
    .register(StorageAssetRepository)
    .use(PrismaStorageAssetRepository)
    .withDependencies([PrismaClient]);
  builder
    .registerAndUse(UploadFileUseCase)
    .withDependencies([StorageProvider, StorageAssetRepository, FileStorageConfig]);
  builder
    .registerAndUse(DeleteFileUseCase)
    .withDependencies([StorageProvider, StorageAssetRepository]);
  builder.registerAndUse(ResolveImageUrlsUseCase).withDependencies([StorageProvider]);
  builder
    .registerAndUse(FileController)
    .withDependencies([UploadFileUseCase, DeleteFileUseCase]);

  // Page
  builder
    .register(PageRepository)
    .use(PrismaPageRepository)
    .withDependencies([PrismaClient]);
  builder
    .registerAndUse(GetPageBySlugUseCase)
    .withDependencies([PageRepository, ResolveImageUrlsUseCase]);
  builder.registerAndUse(PageController).withDependencies([GetPageBySlugUseCase]);
  builder.registerAndUse(ListPagesUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(GetPageByIdUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(CreatePageUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(UpdatePageUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(DeletePageUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(AddSectionUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(UpdateSectionUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(DeleteSectionUseCase).withDependencies([PageRepository]);
  builder.registerAndUse(ReorderSectionsUseCase).withDependencies([PageRepository]);
  builder
    .registerAndUse(AdminPageController)
    .withDependencies([
      ListPagesUseCase,
      GetPageByIdUseCase,
      CreatePageUseCase,
      UpdatePageUseCase,
      DeletePageUseCase,
      AddSectionUseCase,
      UpdateSectionUseCase,
      DeleteSectionUseCase,
      ReorderSectionsUseCase,
    ]);

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
  builder
    .registerAndUse(SendContactEmailUseCase)
    .withDependencies([EmailService, GlobalSettingsRepository]);
  builder.registerAndUse(ContactController).withDependencies([SendContactEmailUseCase]);

  // Auth: panel de administración. Cuentas reales (AdminUser), sin scoping
  // por tenant — es la herramienta interna de la agencia, no un login por
  // cliente. `scrypt` (node:crypto) evita una dependencia externa para
  // hashing; el token es JWT Bearer, no cookie, para no lidiar con
  // SameSite/credentials entre `admin.<dominio>` y la API en otro origen.
  builder
    .register(AdminUserRepository)
    .use(PrismaAdminUserRepository)
    .withDependencies([PrismaClient]);
  builder.register(PasswordHasher).use(ScryptPasswordHasher).withDependencies([]);
  builder
    .register(JwtConfig)
    .useFactory(
      () =>
        new JwtConfig(env.get('AUTH_JWT_SECRET'), env.get('AUTH_TOKEN_TTL_HOURS') * 3600),
    )
    .asSingleton();
  builder.register(TokenService).use(JwtTokenService).withDependencies([JwtConfig]);
  builder
    .registerAndUse(LoginUseCase)
    .withDependencies([AdminUserRepository, PasswordHasher, TokenService]);
  builder
    .registerAndUse(VerifyTokenUseCase)
    .withDependencies([TokenService, AdminUserRepository]);
  builder.registerAndUse(AuthController).withDependencies([LoginUseCase]);

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
        fileController: this.services.get(FileController),
        tenantController: this.services.get(TenantController),
        authController: this.services.get(AuthController),
        adminTenantController: this.services.get(AdminTenantController),
        adminPageController: this.services.get(AdminPageController),
      },
      env.get('CORS_ORIGIN'),
      createFileUploadMiddleware(this.services.get(FileStorageConfig).maxFileSizeBytes),
      createTenantResolver(this.services.get(ResolveTenantUseCase)),
      createAdminAuthMiddleware(this.services.get(VerifyTokenUseCase)),
    );
  }

  public getApp(): Express {
    return this.app;
  }

  public async dispose(): Promise<void> {
    await this.services.get(PrismaConnection).close();
  }
}

import type { Express } from 'express';
import { ContainerBuilder, type Container as ServiceContainer } from 'diod';
import type { EnvConfig } from './shared/config/EnvConfig';
import { PrismaConnection } from './shared/infrastructure/database/PrismaConnection';
import { PrismaClient } from './shared/infrastructure/prisma/generated/client';
import { PageRepository } from './modules/Page/domain/PageRepository';
import { PrismaPageRepository } from './modules/Page/infrastructure/PrismaPageRepository';
import { GetPageBySlugUseCase } from './modules/Page/application/GetPageBySlugUseCase';
import { ListPagesUseCase } from './modules/Page/application/ListPagesUseCase';
import { ListPublishedPagesUseCase } from './modules/Page/application/ListPublishedPagesUseCase';
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
import { ContactMessageRepository } from './modules/Contact/domain/ContactMessageRepository';
import { PrismaContactMessageRepository } from './modules/Contact/infrastructure/PrismaContactMessageRepository';
import { ListContactMessagesUseCase } from './modules/Contact/application/ListContactMessagesUseCase';
import { MarkContactMessageReadUseCase } from './modules/Contact/application/MarkContactMessageReadUseCase';
import { AdminContactMessageController } from './modules/Contact/presentation/AdminContactMessageController';
import { TenantRepository } from './modules/Tenant/domain/TenantRepository';
import { PrismaTenantRepository } from './modules/Tenant/infrastructure/PrismaTenantRepository';
import { ResolveTenantUseCase } from './modules/Tenant/application/ResolveTenantUseCase';
import { IsDomainAllowedUseCase } from './modules/Tenant/application/IsDomainAllowedUseCase';
import { ListTenantsUseCase } from './modules/Tenant/application/ListTenantsUseCase';
import { CreateTenantUseCase } from './modules/Tenant/application/CreateTenantUseCase';
import { ListSiteTemplatesUseCase } from './modules/Tenant/application/ListSiteTemplatesUseCase';
import { SiteContentSource } from './modules/Tenant/domain/SiteContentSource';
import { TemplateSiteContentSource } from './modules/Tenant/infrastructure/TemplateSiteContentSource';
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
import { ListMediaUseCase } from './modules/FileStorage/application/ListMediaUseCase';
import { DeleteMediaUseCase } from './modules/FileStorage/application/DeleteMediaUseCase';
import { DescribeMediaUseCase } from './modules/FileStorage/application/DescribeMediaUseCase';
import { MediaController } from './modules/FileStorage/presentation/MediaController';
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
import { ApiKeyRepository } from './modules/ApiKey/domain/ApiKeyRepository';
import { PrismaApiKeyRepository } from './modules/ApiKey/infrastructure/PrismaApiKeyRepository';
import { AuthenticateApiKeyUseCase } from './modules/ApiKey/application/AuthenticateApiKeyUseCase';
import { CreateApiKeyUseCase } from './modules/ApiKey/application/CreateApiKeyUseCase';
import { ListApiKeysUseCase } from './modules/ApiKey/application/ListApiKeysUseCase';
import { RevokeApiKeyUseCase } from './modules/ApiKey/application/RevokeApiKeyUseCase';
import { RegenerateApiKeyUseCase } from './modules/ApiKey/application/RegenerateApiKeyUseCase';
import { RateLimiter } from './modules/ApiKey/application/RateLimiter';
import { ApiKeyController } from './modules/ApiKey/presentation/ApiKeyController';
import { createActorMiddleware } from './modules/ApiKey/presentation/actorMiddleware';
import { ActivityLogRepository } from './modules/ActivityLog/domain/ActivityLogRepository';
import { PrismaActivityLogRepository } from './modules/ActivityLog/infrastructure/PrismaActivityLogRepository';
import { RecordActivityUseCase } from './modules/ActivityLog/application/RecordActivityUseCase';
import { SearchActivityUseCase } from './modules/ActivityLog/application/SearchActivityUseCase';
import { ActivityLogController } from './modules/ActivityLog/presentation/ActivityLogController';
import { createActivityRecordingMiddleware } from './modules/ActivityLog/presentation/activityRecordingMiddleware';
import { CatalogProvider } from './modules/Catalog/domain/CatalogProvider';
import {
  CatalogConfig,
  HttpCatalogProvider,
} from './modules/Catalog/infrastructure/HttpCatalogProvider';
import { GetCatalogUseCase } from './modules/Catalog/application/GetCatalogUseCase';
import { CatalogController } from './modules/Catalog/presentation/CatalogController';
import { NewsletterRepository } from './modules/Newsletter/domain/NewsletterRepository';
import { PrismaNewsletterRepository } from './modules/Newsletter/infrastructure/PrismaNewsletterRepository';
import { SubscribeToNewsletterUseCase } from './modules/Newsletter/application/SubscribeToNewsletterUseCase';
import { ListSubscribersUseCase } from './modules/Newsletter/application/ListSubscribersUseCase';
import { NewsletterController } from './modules/Newsletter/presentation/NewsletterController';
import { CreateLegalPageUseCase } from './modules/LegalPages/application/CreateLegalPageUseCase';
import { LegalPageController } from './modules/LegalPages/presentation/LegalPageController';
import { SiteCacheInvalidator } from './modules/SiteCache/domain/SiteCacheInvalidator';
import {
  HttpSiteCacheInvalidator,
  SiteCacheConfig,
} from './modules/SiteCache/infrastructure/HttpSiteCacheInvalidator';
import { InvalidateTenantCacheUseCase } from './modules/SiteCache/application/InvalidateTenantCacheUseCase';
import { createCacheInvalidationMiddleware } from './modules/SiteCache/presentation/cacheInvalidationMiddleware';
import { BrandRepository } from './modules/Brand/domain/BrandRepository';
import { PrismaBrandRepository } from './modules/Brand/infrastructure/PrismaBrandRepository';
import { GetBrandUseCase } from './modules/Brand/application/GetBrandUseCase';
import { UpdateBrandUseCase } from './modules/Brand/application/UpdateBrandUseCase';
import { ResolveBrandAssetsUseCase } from './modules/Brand/application/ResolveBrandAssetsUseCase';
import { AdminBrandController } from './modules/Brand/presentation/AdminBrandController';
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
  builder.register(SiteContentSource).use(TemplateSiteContentSource).withDependencies([]);
  builder
    .registerAndUse(CreateTenantUseCase)
    .withDependencies([TenantRepository, SiteContentSource]);
  builder.registerAndUse(ListSiteTemplatesUseCase).withDependencies([SiteContentSource]);
  builder
    .registerAndUse(AdminTenantController)
    .withDependencies([
      ListTenantsUseCase,
      CreateTenantUseCase,
      ListSiteTemplatesUseCase,
    ]);

  // SiteCache: cada escritura admin avisa al frontend qué dominios invalidar (SPEC 0.2).
  builder
    .register(SiteCacheConfig)
    .useFactory(
      () =>
        new SiteCacheConfig(
          env.get('WEBAPP_REVALIDATE_URL'),
          env.get('REVALIDATE_SECRET'),
        ),
    )
    .asSingleton();
  builder
    .register(SiteCacheInvalidator)
    .use(HttpSiteCacheInvalidator)
    .withDependencies([SiteCacheConfig]);
  builder
    .registerAndUse(InvalidateTenantCacheUseCase)
    .withDependencies([TenantRepository, SiteCacheInvalidator]);

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
  builder
    .registerAndUse(ListMediaUseCase)
    .withDependencies([StorageAssetRepository, StorageProvider]);
  builder
    .registerAndUse(DeleteMediaUseCase)
    .withDependencies([StorageAssetRepository, StorageProvider]);
  builder.registerAndUse(DescribeMediaUseCase).withDependencies([StorageAssetRepository]);
  builder
    .registerAndUse(MediaController)
    .withDependencies([
      UploadFileUseCase,
      ListMediaUseCase,
      DeleteMediaUseCase,
      DescribeMediaUseCase,
    ]);

  // Page
  builder
    .register(PageRepository)
    .use(PrismaPageRepository)
    .withDependencies([PrismaClient]);
  builder
    .registerAndUse(GetPageBySlugUseCase)
    .withDependencies([PageRepository, ResolveImageUrlsUseCase]);
  builder.registerAndUse(ListPublishedPagesUseCase).withDependencies([PageRepository]);
  builder
    .registerAndUse(PageController)
    .withDependencies([GetPageBySlugUseCase, ListPublishedPagesUseCase]);
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

  // Brand: identidad de marca y estilo visual. Va antes que GlobalSettings, que lo expone.
  builder
    .register(BrandRepository)
    .use(PrismaBrandRepository)
    .withDependencies([PrismaClient]);
  builder.registerAndUse(GetBrandUseCase).withDependencies([BrandRepository]);
  builder.registerAndUse(UpdateBrandUseCase).withDependencies([BrandRepository]);
  builder.registerAndUse(ResolveBrandAssetsUseCase).withDependencies([StorageProvider]);
  builder
    .registerAndUse(AdminBrandController)
    .withDependencies([GetBrandUseCase, UpdateBrandUseCase]);

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
    .withDependencies([
      GetGlobalSettingsUseCase,
      GetBrandUseCase,
      ResolveBrandAssetsUseCase,
    ]);

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
    .register(ContactMessageRepository)
    .use(PrismaContactMessageRepository)
    .withDependencies([PrismaClient]);
  builder
    .registerAndUse(SendContactEmailUseCase)
    .withDependencies([EmailService, GlobalSettingsRepository, ContactMessageRepository]);
  builder
    .registerAndUse(ListContactMessagesUseCase)
    .withDependencies([ContactMessageRepository]);
  builder
    .registerAndUse(MarkContactMessageReadUseCase)
    .withDependencies([ContactMessageRepository]);
  builder
    .registerAndUse(AdminContactMessageController)
    .withDependencies([ListContactMessagesUseCase, MarkContactMessageReadUseCase]);

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

  // ApiKey: el mismo middleware de actor resuelve una sesión de panel o una clave de
  // agente, para que ambos entren por las mismas rutas con las mismas reglas (Épica 10).
  builder
    .register(ApiKeyRepository)
    .use(PrismaApiKeyRepository)
    .withDependencies([PrismaClient]);
  builder
    .register(RateLimiter)
    .useFactory(() => new RateLimiter())
    .asSingleton();
  builder.registerAndUse(AuthenticateApiKeyUseCase).withDependencies([ApiKeyRepository]);
  builder.registerAndUse(CreateApiKeyUseCase).withDependencies([ApiKeyRepository]);
  builder.registerAndUse(ListApiKeysUseCase).withDependencies([ApiKeyRepository]);
  builder.registerAndUse(RevokeApiKeyUseCase).withDependencies([ApiKeyRepository]);
  builder.registerAndUse(RegenerateApiKeyUseCase).withDependencies([ApiKeyRepository]);
  builder
    .registerAndUse(ApiKeyController)
    .withDependencies([
      CreateApiKeyUseCase,
      ListApiKeysUseCase,
      RevokeApiKeyUseCase,
      RegenerateApiKeyUseCase,
    ]);

  // ActivityLog
  builder
    .register(ActivityLogRepository)
    .use(PrismaActivityLogRepository)
    .withDependencies([PrismaClient]);
  builder.registerAndUse(RecordActivityUseCase).withDependencies([ActivityLogRepository]);
  builder.registerAndUse(SearchActivityUseCase).withDependencies([ActivityLogRepository]);
  builder.registerAndUse(ActivityLogController).withDependencies([SearchActivityUseCase]);

  // El ContactController comparte el limitador con las claves: mismo mecanismo, otra clave.
  builder
    .registerAndUse(ContactController)
    .withDependencies([SendContactEmailUseCase, RateLimiter]);

  // Catalog: la API solo reexpone lo que declara el frontend, más las tipografías.
  builder
    .register(CatalogConfig)
    .useFactory(() => new CatalogConfig(env.get('WEBAPP_CATALOG_URL')))
    .asSingleton();
  builder
    .register(CatalogProvider)
    .use(HttpCatalogProvider)
    .withDependencies([CatalogConfig]);
  builder.registerAndUse(GetCatalogUseCase).withDependencies([CatalogProvider]);
  builder.registerAndUse(CatalogController).withDependencies([GetCatalogUseCase]);

  // LegalPages: plantillas de privacidad y términos rellenadas con los datos del negocio.
  builder
    .registerAndUse(CreateLegalPageUseCase)
    .withDependencies([PageRepository, GlobalSettingsRepository]);
  builder.registerAndUse(LegalPageController).withDependencies([CreateLegalPageUseCase]);

  // Newsletter: comparte el limitador con contacto y con las claves de agente.
  builder
    .register(NewsletterRepository)
    .use(PrismaNewsletterRepository)
    .withDependencies([PrismaClient]);
  builder
    .registerAndUse(SubscribeToNewsletterUseCase)
    .withDependencies([NewsletterRepository]);
  builder.registerAndUse(ListSubscribersUseCase).withDependencies([NewsletterRepository]);
  builder
    .registerAndUse(NewsletterController)
    .withDependencies([
      SubscribeToNewsletterUseCase,
      ListSubscribersUseCase,
      RateLimiter,
    ]);

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
        adminBrandController: this.services.get(AdminBrandController),
        apiKeyController: this.services.get(ApiKeyController),
        activityLogController: this.services.get(ActivityLogController),
        adminContactMessageController: this.services.get(AdminContactMessageController),
        catalogController: this.services.get(CatalogController),
        legalPageController: this.services.get(LegalPageController),
        newsletterController: this.services.get(NewsletterController),
        mediaController: this.services.get(MediaController),
      },
      env.get('CORS_ORIGIN'),
      createFileUploadMiddleware(this.services.get(FileStorageConfig).maxFileSizeBytes),
      createTenantResolver(this.services.get(ResolveTenantUseCase)),
      createActorMiddleware(
        this.services.get(VerifyTokenUseCase),
        this.services.get(AuthenticateApiKeyUseCase),
        this.services.get(RateLimiter),
      ),
      createCacheInvalidationMiddleware(this.services.get(InvalidateTenantCacheUseCase)),
      createActivityRecordingMiddleware(this.services.get(RecordActivityUseCase)),
    );
  }

  public getApp(): Express {
    return this.app;
  }

  public async dispose(): Promise<void> {
    await this.services.get(PrismaConnection).close();
  }
}

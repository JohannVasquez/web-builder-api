/* eslint-disable boundaries/dependencies */
import { execSync } from 'child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { PrismaTenantRepository } from '@/modules/Tenant/infrastructure/PrismaTenantRepository';
import { PrismaPageRepository } from '@/modules/Page/infrastructure/PrismaPageRepository';
import { PrismaGlobalSettingsRepository } from '@/modules/GlobalSettings/infrastructure/PrismaGlobalSettingsRepository';
import { PrismaNavigationRepository } from '@/modules/Navigation/infrastructure/PrismaNavigationRepository';
import { PrismaStorageAssetRepository } from '@/modules/FileStorage/infrastructure/PrismaStorageAssetRepository';
import { ReviewSiteQualityUseCase } from '@/modules/SiteQualityReview/application/ReviewSiteQualityUseCase';
import { CreateTenantUseCase } from '@/modules/Tenant/application/CreateTenantUseCase';
import 'dotenv/config';

describe('Demo Sites Integration', () => {
  let prisma: PrismaClient;
  let reviewUseCase: ReviewSiteQualityUseCase;
  let createTenantUseCase: CreateTenantUseCase;
  let tenantRepository: PrismaTenantRepository;

  beforeAll(() => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not defined');
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    
    tenantRepository = new PrismaTenantRepository(prisma);
    const pageRepo = new PrismaPageRepository(prisma);
    const settingsRepo = new PrismaGlobalSettingsRepository(prisma);
    const navRepo = new PrismaNavigationRepository(prisma);
    const storageRepo = new PrismaStorageAssetRepository(prisma);

    reviewUseCase = new ReviewSiteQualityUseCase(pageRepo, settingsRepo, navRepo, storageRepo);
    createTenantUseCase = new CreateTenantUseCase(tenantRepository, {
      fromTemplate: jest.fn(),
      listTemplates: jest.fn(),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('siembra las tres demostraciones correctamente y es idempotente', () => {
    // Primera siembra
    execSync('npx tsx prisma/seed.ts', { stdio: 'ignore' });
    // Segunda siembra para verificar idempotencia (no debe fallar)
    expect(() => execSync('npx tsx prisma/seed.ts', { stdio: 'ignore' })).not.toThrow();
  }, 30000);

  const DEMO_SLUGS = ['demo-pasteleria', 'demo-construccion', 'demo-spa'];

  it('cada demostración usa un estilo visual distinto y sus páginas legales están publicadas', async () => {
    const demos = await prisma.tenant.findMany({
      where: { slug: { in: DEMO_SLUGS } },
      include: { brand: true, pages: true },
    });

    expect(demos).toHaveLength(3);

    const styles = new Set(demos.map(d => d.brand?.visualStyle));
    expect(styles.size).toBe(3); // classic, minimal, neo-brutalism

    for (const demo of demos) {
      const legalPage = demo.pages.find(p => p.slug === 'politica-de-privacidad');
      expect(legalPage).toBeDefined();
      expect(legalPage?.isPublished).toBe(true);
    }
  });

  it('duplicar una demostración produce un cliente despublicado', async () => {
    const demo = await prisma.tenant.findUniqueOrThrow({
      where: { slug: 'demo-pasteleria' },
    });

    const newSlug = `clone-${Date.now()}`;
    const newTenant = await createTenantUseCase.execute({
      slug: newSlug,
      name: 'Clone Demo',
      domains: [`${newSlug}.localhost`],
      duplicateFromTenantId: demo.id,
    });

    // Validar que nace despublicado: las páginas no deben tener publishedContent o isPublished=false
    const pages = await prisma.page.findMany({
      where: { tenantId: newTenant.id },
    });

    for (const page of pages) {
      expect(page.isPublished).toBe(false);
      expect(page.publishedContent).toBeNull();
    }
  });

  it('pasa la revisión de calidad sin observaciones', async () => {
    const demos = await prisma.tenant.findMany({
      where: { slug: { in: DEMO_SLUGS } },
    });

    for (const demo of demos) {
      const observations = await reviewUseCase.execute(demo.id);
      expect(observations).toEqual([]);
    }
  });
});

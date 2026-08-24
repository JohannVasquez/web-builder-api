import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/shared/infrastructure/prisma/generated/client';
import { StorageAssetsSeeder } from './seeders/StorageAssetsSeeder';
import { TenantSeeder } from './seeders/TenantSeeder';
import { GlobalSettingsSeeder } from './seeders/GlobalSettingsSeeder';
import { NavigationSeeder } from './seeders/NavigationSeeder';
import { PageSeeder } from './seeders/PageSeeder';
import { TENANT_TEMPLATES } from './seeders/templates';

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * Orquestador: cada módulo tiene su propio seeder en `prisma/seeders/`
 * (contrato `Seeder<TParams, TResult>`); aquí solo se encadenan en orden
 * y se recorren los tenants definidos en `seeders/templates.ts`.
 */
const seed = async (): Promise<void> => {
  const assets = await new StorageAssetsSeeder().execute(prisma);

  const tenantSeeder = new TenantSeeder(prisma);
  const globalSettingsSeeder = new GlobalSettingsSeeder(prisma);
  const navigationSeeder = new NavigationSeeder(prisma);
  const pageSeeder = new PageSeeder(prisma);

  for (const template of TENANT_TEMPLATES) {
    const tenant = await tenantSeeder.execute(template.tenant);
    await globalSettingsSeeder.execute({
      tenantId: tenant.id,
      settings: template.settings,
    });
    await navigationSeeder.execute({ tenantId: tenant.id, links: template.navigation });
    await pageSeeder.execute({
      tenantId: tenant.id,
      pages: template.buildPages(assets),
    });
    console.log(
      `Seeded tenant "${tenant.slug}" (${template.tenant.domains.join(', ')}): settings, navigation and pages`,
    );
  }

  console.log(
    `Seeded ${TENANT_TEMPLATES.length} tenants and ${
      assets === null ? 0 : Object.keys(assets).length
    } storage assets`,
  );
};

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

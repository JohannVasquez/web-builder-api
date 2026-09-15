import { PrismaBrandRepository } from './PrismaBrandRepository';
import { BrandSchema } from '../domain/BrandSchema';
import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';

type MockedPrisma = PrismaClient & {
  tenantBrand: { findUnique: jest.Mock; upsert: jest.Mock };
};

describe('PrismaBrandRepository', () => {
  const buildPrisma = (): MockedPrisma =>
    ({
      tenantBrand: { findUnique: jest.fn(), upsert: jest.fn() },
    }) as unknown as MockedPrisma;

  describe('find', () => {
    it('returns the default brand when there is no row', async () => {
      const prisma = buildPrisma();
      prisma.tenantBrand.findUnique.mockResolvedValue(null);
      const repository = new PrismaBrandRepository(prisma);

      const brand = await repository.find(3);

      expect(brand).toEqual(BrandSchema.parse({}));
    });

    it('returns the default brand when the row is invalid, instead of throwing', async () => {
      const prisma = buildPrisma();
      prisma.tenantBrand.findUnique.mockResolvedValue({
        palette: {},
        typography: { pairing: 'inter', scale: 'normal' },
        assets: {},
        colorMode: 'morado',
        visualStyle: 'classic',
      });
      const repository = new PrismaBrandRepository(prisma);

      const brand = await repository.find(3);

      expect(brand).toEqual(BrandSchema.parse({}));
    });
  });

  describe('update', () => {
    it('merges by section: sending only colorMode keeps the existing palette', async () => {
      const prisma = buildPrisma();
      prisma.tenantBrand.findUnique.mockResolvedValue({
        palette: { primary: '#1d4ed8' },
        typography: { pairing: 'inter', scale: 'normal' },
        assets: {},
        colorMode: 'system',
        visualStyle: 'classic',
      });
      prisma.tenantBrand.upsert.mockImplementation(({ update }) =>
        Promise.resolve(update),
      );
      const repository = new PrismaBrandRepository(prisma);

      const brand = await repository.update(3, { colorMode: 'dark' });

      expect(brand.palette).toEqual({ primary: '#1d4ed8' });
      expect(brand.colorMode).toBe('dark');
    });

    it('replaces the palette entirely when palette is sent: a color no longer sent disappears', async () => {
      const prisma = buildPrisma();
      prisma.tenantBrand.findUnique.mockResolvedValue({
        palette: { primary: '#1d4ed8', accent: '#38bdf8' },
        typography: { pairing: 'inter', scale: 'normal' },
        assets: {},
        colorMode: 'system',
        visualStyle: 'classic',
      });
      prisma.tenantBrand.upsert.mockImplementation(({ update }) =>
        Promise.resolve(update),
      );
      const repository = new PrismaBrandRepository(prisma);

      const brand = await repository.update(3, { palette: { primary: '#0f766e' } });

      expect(brand.palette).toEqual({ primary: '#0f766e' });
    });
  });
});

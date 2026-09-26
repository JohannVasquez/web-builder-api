import { ReviewSiteQualityUseCase } from './ReviewSiteQualityUseCase';
import type { PageRepository } from '@/modules/Page/domain/PageRepository';
import type { GlobalSettingsRepository } from '@/modules/GlobalSettings/domain/GlobalSettingsRepository';
import type { NavigationRepository } from '@/modules/Navigation/domain/NavigationRepository';
import type { StorageAssetRepository } from '@/modules/FileStorage/domain/StorageAssetRepository';
import { Page, PageSection, EMPTY_PAGE_SEO } from '@/modules/Page/domain/Page';
import { GlobalSettings } from '@/modules/GlobalSettings/domain/GlobalSettings';
import { NavigationLink } from '@/modules/Navigation/domain/NavigationLink';
import type { MediaAsset } from '@/modules/FileStorage/domain/StorageAssetRepository';

const TENANT = '018f6f1a-0000-7000-8000-000000000001';

const createFakePageRepo = (pages: Page[]): PageRepository => ({
  findAllByTenant: () => Promise.resolve(pages),
} as unknown as PageRepository);

const createFakeSettingsRepo = (settings: Record<string, string>): GlobalSettingsRepository => ({
  find: () => Promise.resolve(GlobalSettings.fromRecord(settings)),
} as unknown as GlobalSettingsRepository);

const createFakeNavRepo = (links: NavigationLink[]): NavigationRepository => ({
  findAll: () => Promise.resolve(links),
} as unknown as NavigationRepository);

const createFakeMediaRepo = (assets: MediaAsset[]): StorageAssetRepository => ({
  findByTenant: () => Promise.resolve(assets),
} as unknown as StorageAssetRepository);

describe('ReviewSiteQualityUseCase', () => {
  it('un sitio sin observaciones devuelve lista vacía', async () => {
    const pages = [
      new Page(
        'home',
        'Inicio',
        'Descripción inicial',
        [new PageSection('Hero', 0, { title: 'Texto original largo inventado y distinto', description: 'Otra cosa de mas de 15 caracteres distinta de los templates' }, null, 'sec-1', false)],
        'page-1',
        true,
        null,
        null,
        { seoTitle: 'T', seoDescription: 'D', ogImage: 'img', noindex: false },
      ),
      new Page(
        'politica-de-privacidad',
        'Política de privacidad',
        '',
        [],
        'page-2',
        true,
        null,
        null,
        { seoTitle: 'T', seoDescription: 'D', ogImage: 'img', noindex: false },
      ),
    ];
    const settings = {
      contactPhone: '+56912345678',
      address: 'Calle Falsa 123',
      openingHours: 'Lunes a Viernes',
      instagramUrl: 'https://instagram.com/algo',
      siteUnderConstruction: 'false',
      contactEmail: 'hola@dominio.cl',
    };
    const links: NavigationLink[] = [new NavigationLink('Inicio', '/', 0)];
    const media: MediaAsset[] = [
      { key: 'img-1', mimeType: 'image/png', size: 100, originalName: '1.png', alt: 'Una imagen descriptiva', createdAt: '' },
    ];

    const useCase = new ReviewSiteQualityUseCase(
      createFakePageRepo(pages),
      createFakeSettingsRepo(settings),
      createFakeNavRepo(links),
      createFakeMediaRepo(media),
    );

    const observations = await useCase.execute(TENANT);
    expect(observations).toEqual([]);
  });

  describe('Textos de ejemplo de los kits', () => {
    it('detecta si un texto de un kit quedó sin reemplazar', async () => {
      // "Técnicos certificados" está en el kit SERVICIOS_TECNICOS_TEMPLATE
      const templateText = 'Técnicos certificados'; 
      const pages = [
        new Page('home', 'Inicio', '', [
          new PageSection('Hero', 0, { eyebrow: templateText }, null, 'sec-1', false),
        ]),
      ];
      const useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo(pages),
        createFakeSettingsRepo({}),
        createFakeNavRepo([]),
        createFakeMediaRepo([]),
      );

      const obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what.includes('Texto de ejemplo sin reemplazar') && o.what.includes(templateText))).toBe(true);
    });
  });

  describe('Imágenes sin texto alternativo', () => {
    it('detecta imágenes sin alt', async () => {
      const useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo([]),
        createFakeSettingsRepo({}),
        createFakeNavRepo([]),
        createFakeMediaRepo([{ key: 'img', mimeType: 'image/png', size: 100, originalName: 'test.png', alt: '', createdAt: '' }]),
      );
      const obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what === 'Imagen sin texto alternativo')).toBe(true);
    });
  });

  describe('Enlaces del menú rotos o sin publicar', () => {
    it('detecta enlaces rotos o no publicados', async () => {
      const pages = [
        new Page('borrador', 'Borrador', '', [], 'p-1', false),
      ];
      const links: NavigationLink[] = [
        new NavigationLink('Borrador', '/borrador', 0),
        new NavigationLink('Roto', '/roto', 1),
      ];
      const useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo(pages),
        createFakeSettingsRepo({}),
        createFakeNavRepo(links),
        createFakeMediaRepo([]),
      );
      const obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what.includes('página sin publicar'))).toBe(true);
      expect(obs.some(o => o.what.includes('Enlace roto en el menú'))).toBe(true);
    });
  });

  describe('Páginas sin SEO', () => {
    it('detecta páginas publicadas sin título, descripción ni imagen', async () => {
      const pages = [
        new Page('home', 'Inicio', '', [], 'p-1', true, null, null, EMPTY_PAGE_SEO),
      ];
      const useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo(pages),
        createFakeSettingsRepo({}),
        createFakeNavRepo([]),
        createFakeMediaRepo([]),
      );
      const obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what === 'Faltan datos para buscadores y redes sociales')).toBe(true);
    });
  });

  describe('Datos del negocio vacíos', () => {
    it('detecta falta de teléfono, dirección, horario o redes', async () => {
      const useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo([]),
        createFakeSettingsRepo({}),
        createFakeNavRepo([]),
        createFakeMediaRepo([]),
      );
      const obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what === 'Falta el teléfono de contacto')).toBe(true);
      expect(obs.some(o => o.what === 'Falta la dirección comercial')).toBe(true);
      expect(obs.some(o => o.what === 'Faltan los horarios de atención')).toBe(true);
      expect(obs.some(o => o.what === 'No hay redes sociales configuradas')).toBe(true);
    });
  });

  describe('Sitio en construcción', () => {
    it('detecta si el sitio sigue marcado en construcción', async () => {
      const useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo([]),
        createFakeSettingsRepo({ siteUnderConstruction: 'true' }),
        createFakeNavRepo([]),
        createFakeMediaRepo([]),
      );
      const obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what.includes('en construcción'))).toBe(true);
    });
  });

  describe('Falta publicar la política de privacidad', () => {
    it('detecta si no hay política de privacidad publicada', async () => {
      const useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo([]), // no pages
        createFakeSettingsRepo({}),
        createFakeNavRepo([]),
        createFakeMediaRepo([]),
      );
      const obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what === 'Falta publicar la política de privacidad')).toBe(true);
    });
  });

  describe('Correo de contacto configurado y válido', () => {
    it('detecta correo ausente o inválido', async () => {
      let useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo([]),
        createFakeSettingsRepo({}),
        createFakeNavRepo([]),
        createFakeMediaRepo([]),
      );
      let obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what === 'Falta el correo de contacto')).toBe(true);

      useCase = new ReviewSiteQualityUseCase(
        createFakePageRepo([]),
        createFakeSettingsRepo({ contactEmail: 'mal-correo' }),
        createFakeNavRepo([]),
        createFakeMediaRepo([]),
      );
      obs = await useCase.execute(TENANT);
      expect(obs.some(o => o.what.includes('El correo configurado no es válido'))).toBe(true);
    });
  });
});

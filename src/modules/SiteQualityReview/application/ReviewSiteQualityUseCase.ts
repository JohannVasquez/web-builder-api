import type { PageRepository } from '@/modules/Page/domain/PageRepository';
import type { GlobalSettingsRepository } from '@/modules/GlobalSettings/domain/GlobalSettingsRepository';
import type { NavigationRepository } from '@/modules/Navigation/domain/NavigationRepository';
import type { StorageAssetRepository } from '@/modules/FileStorage/domain/StorageAssetRepository';
import { SITE_TEMPLATES } from '@/modules/Template/domain/registry';

export interface SiteQualityObservation {
  readonly what: string;
  readonly where: string;
  readonly severity: 'blocking' | 'improvable';
  readonly fix: string;
}

export class ReviewSiteQualityUseCase {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly globalSettingsRepository: GlobalSettingsRepository,
    private readonly navigationRepository: NavigationRepository,
    private readonly storageAssetRepository: StorageAssetRepository,
  ) {}

  public async execute(tenantId: string): Promise<SiteQualityObservation[]> {
    const observations: SiteQualityObservation[] = [];

    const pages = await this.pageRepository.findAllByTenant(tenantId);
    const settings = await this.globalSettingsRepository.find(tenantId);
    const links = await this.navigationRepository.findAll(tenantId);
    const media = await this.storageAssetRepository.findByTenant(tenantId, '');

    const templateTexts = this.getTemplateTexts();

    // 1. Textos de ejemplo de los kits
    for (const page of pages) {
      const checkProp = (val: unknown, sectionName: string): void => {
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (templateTexts.has(trimmed)) {
            observations.push({
              what: `Texto de ejemplo sin reemplazar: "${trimmed.substring(0, 30)}${trimmed.length > 30 ? '...' : ''}"`,
              where: `Página "${page.title}", bloque ${sectionName}`,
              severity: 'blocking',
              fix: 'Cambia este texto por contenido real de tu negocio o elimina el bloque si no lo necesitas.',
            });
          }
        } else if (Array.isArray(val)) {
          val.forEach((v) => {
            checkProp(v, sectionName);
          });
        } else if (val !== null && typeof val === 'object') {
          Object.values(val).forEach((v) => {
            checkProp(v, sectionName);
          });
        }
      };

      for (const section of page.sections) {
        checkProp(section.props, section.type);
      }
    }

    // 2. Imágenes sin texto alternativo
    for (const asset of media) {
      if (asset.alt === null || asset.alt.trim() === '') {
        observations.push({
          what: 'Imagen sin texto alternativo',
          where: `Biblioteca de imágenes (${asset.originalName ?? asset.key})`,
          severity: 'blocking',
          fix: 'Agrega una breve descripción de lo que se ve en la imagen para que el sitio sea accesible a lectores de pantalla.',
        });
      }
    }

    // 3. Enlaces del menú rotos o a páginas sin publicar
    for (const link of links) {
      const isInternal = link.href.startsWith('/') && !link.href.includes('#');
      if (isInternal) {
        const slug = link.href === '/' ? 'home' : link.href.substring(1);
        const targetPage = pages.find((p) => p.slug === slug);

        if (targetPage === undefined) {
          observations.push({
            what: `Enlace roto en el menú: apunta a "${link.href}" que no existe`,
            where: `Menú de navegación, enlace "${link.label}"`,
            severity: 'blocking',
            fix: 'Cambia el destino del enlace a una página que exista o bórralo del menú.',
          });
        } else if (!targetPage.isPublished) {
          observations.push({
            what: `Enlace a página sin publicar: apunta a "${link.href}"`,
            where: `Menú de navegación, enlace "${link.label}"`,
            severity: 'blocking',
            fix: 'Publica la página de destino o quita el enlace del menú hasta que esté lista.',
          });
        }
      }
    }

    // 4. Páginas sin SEO
    for (const page of pages) {
      if (page.isPublished) {
        if (!page.seo.seoTitle && !page.seo.seoDescription && !page.seo.ogImage) {
          observations.push({
            what: 'Faltan datos para buscadores y redes sociales',
            where: `Página "${page.title}"`,
            severity: 'improvable',
            fix: 'Configura un título, descripción o imagen para que la página destaque al compartirla.',
          });
        }
      }
    }

    // 5. Datos del negocio vacíos
    if (!settings.get('contactPhone')) {
      observations.push({
        what: 'Falta el teléfono de contacto',
        where: 'Configuración global',
        severity: 'improvable',
        fix: 'Agrega un teléfono para que los clientes puedan llamar.',
      });
    }
    if (!settings.get('address')) {
      observations.push({
        what: 'Falta la dirección comercial',
        where: 'Configuración global',
        severity: 'improvable',
        fix: 'Agrega una dirección para dar confianza, aunque sea la ciudad o región.',
      });
    }
    if (!settings.get('openingHours')) {
      observations.push({
        what: 'Faltan los horarios de atención',
        where: 'Configuración global',
        severity: 'improvable',
        fix: 'Indica cuándo estás disponible para responder consultas.',
      });
    }
    const hasSocial =
      settings.get('instagramUrl') !== '' ||
      settings.get('facebookUrl') !== '' ||
      settings.get('tiktokUrl') !== '' ||
      settings.get('linkedinUrl') !== '' ||
      settings.get('youtubeUrl') !== '' ||
      settings.get('xUrl') !== '';
    if (!hasSocial) {
      observations.push({
        what: 'No hay redes sociales configuradas',
        where: 'Configuración global',
        severity: 'improvable',
        fix: 'Agrega al menos una red social si el negocio tiene presencia en ellas.',
      });
    }

    // 6. Sitio en construcción
    if (settings.get('siteUnderConstruction') === 'true') {
      observations.push({
        what: 'El sitio está marcado como "en construcción"',
        where: 'Configuración global',
        severity: 'blocking',
        fix: 'Desactiva el modo de construcción para que el sitio sea visible al público.',
      });
    }

    // 7. Política de privacidad
    const privacyPage = pages.find(
      (p) => p.slug === 'politica-de-privacidad' || p.title.toLowerCase().includes('privacidad'),
    );
    if (privacyPage === undefined || !privacyPage.isPublished) {
      observations.push({
        what: 'Falta publicar la política de privacidad',
        where: 'Páginas legales',
        severity: 'blocking',
        fix: 'Crea y publica la política de privacidad desde la sección de páginas legales.',
      });
    }

    // 8. Correo de contacto
    const email = settings.get('contactEmail');
    if (!email) {
      observations.push({
        what: 'Falta el correo de contacto',
        where: 'Configuración global',
        severity: 'blocking',
        fix: 'Configura un correo al que llegarán los mensajes del formulario de contacto.',
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      observations.push({
        what: `El correo configurado no es válido (${email})`,
        where: 'Configuración global',
        severity: 'blocking',
        fix: 'Corrige la dirección de correo para no perder los mensajes de tus clientes.',
      });
    }

    return observations;
  }

  private getTemplateTexts(): Set<string> {
    const texts = new Set<string>();
    const add = (val: unknown): void => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        // Criterio: tiene espacios y es lo suficientemente largo para ser una frase o titular real.
        if (trimmed.length > 15 && trimmed.includes(' ')) {
          texts.add(trimmed);
        }
      } else if (Array.isArray(val)) {
        val.forEach(add);
      } else if (val !== null && typeof val === 'object') {
        Object.values(val).forEach(add);
      }
    };

    for (const template of SITE_TEMPLATES) {
      add(template.settings);
      for (const page of template.pages) {
        add(page.title);
        add(page.description);
        for (const section of page.sections) {
          add(section.props);
        }
      }
    }
    return texts;
  }
}

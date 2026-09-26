import { SITE_TEMPLATES, findSiteTemplate } from './registry';
import { BrandUpdateSchema } from '@/modules/Brand/domain/BrandSchema';
import type { TemplatePage, TemplateSection } from './SiteTemplate';

const VALID_SECTION_TYPES = [
  'Hero',
  'Features',
  'CallToAction',
  'TextBlock',
  'ContactForm',
  'Stats',
  'ServiceCards',
  'SplitHighlights',
  'Testimonials',
  'LocationMap',
  'Columns',
];

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Recorre cualquier prop en profundidad para detectar referencias a imágenes:
// los kits no traen `imageUrl`, `images` ni `backgroundImageUrl`, las sube el cliente.
const IMAGE_PROP_NAMES = new Set(['imageUrl', 'images', 'backgroundImageUrl']);

const findImageReference = (value: unknown, path: string): string | undefined => {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findImageReference(item, `${path}[${index}]`);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (IMAGE_PROP_NAMES.has(key)) {
        return `${path}.${key}`;
      }
      const found = findImageReference(nested, `${path}.${key}`);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
};

const collectSections = (page: TemplatePage): readonly TemplateSection[] => page.sections;

describe('SITE_TEMPLATES', () => {
  it('has exactly 6 kits with unique ids', () => {
    expect(SITE_TEMPLATES).toHaveLength(6);
    const ids = SITE_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the six expected industries', () => {
    const ids = SITE_TEMPLATES.map((template) => template.id).sort();
    expect(ids).toEqual(
      [
        'construccion',
        'pasteleria',
        'profesional-independiente',
        'restaurante',
        'salud-belleza',
        'servicios-tecnicos',
      ].sort(),
    );
  });

  describe('findSiteTemplate', () => {
    it('returns the matching kit by id', () => {
      const found = findSiteTemplate('restaurante');
      expect(found?.id).toBe('restaurante');
    });

    it('returns undefined for an unknown id', () => {
      expect(findSiteTemplate('rubro-inexistente')).toBeUndefined();
    });
  });

  describe.each(SITE_TEMPLATES)('kit $id', (template) => {
    it('has at least 4 pages, one of them home', () => {
      expect(template.pages.length).toBeGreaterThanOrEqual(4);
      const home = template.pages.find((page) => page.slug === 'home');
      expect(home).toBeDefined();
    });

    it('has a home page with at least 5 sections', () => {
      const home = template.pages.find((page) => page.slug === 'home');
      expect(home?.sections.length ?? 0).toBeGreaterThanOrEqual(5);
    });

    it('only uses valid section types', () => {
      for (const page of template.pages) {
        for (const section of collectSections(page)) {
          expect(VALID_SECTION_TYPES).toContain(section.type);
        }
      }
    });

    it('validates the brand with BrandUpdateSchema, as production does', () => {
      expect(() => BrandUpdateSchema.parse(template.brand)).not.toThrow();
    });

    it('never references images: the client uploads those afterwards', () => {
      for (const page of template.pages) {
        for (const [sectionIndex, section] of page.sections.entries()) {
          const found = findImageReference(
            section.props,
            `${page.slug}.sections[${sectionIndex}].props`,
          );
          expect(found).toBeUndefined();
        }
      }
    });

    it('has unique, kebab-case slugs', () => {
      const slugs = template.pages.map((page) => page.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) {
        expect(slug).toMatch(KEBAB_CASE);
      }
    });

    it('points every navigation href to a kit page or an anchor', () => {
      const slugs = new Set(template.pages.map((page) => page.slug));
      for (const link of template.navigation) {
        if (link.href.startsWith('#')) {
          continue;
        }
        const pageSlug = link.href === '/' ? 'home' : link.href.replace(/^\//, '');
        expect(slugs.has(pageSlug)).toBe(true);
      }
    });
  });
});

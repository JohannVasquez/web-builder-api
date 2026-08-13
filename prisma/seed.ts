import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/shared/infrastructure/prisma/generated/client';

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

interface SectionSeed {
  readonly type: string;
  readonly position: number;
  readonly props: Record<string, unknown>;
  /** Permite enlazar la sección con `/slug#ancla` (útil para sitios one-page). */
  readonly anchor?: string;
}

interface PageSeed {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly sections: readonly SectionSeed[];
}

interface NavigationSeed {
  readonly label: string;
  readonly href: string;
  readonly position: number;
}

/**
 * El menú del sitio vive en la base de datos: cada entrada puede apuntar a una
 * página propia (`/nosotros`) o al ancla de una sección (`/#caracteristicas`),
 * lo que permite estructurar el sitio como multi-página o como one-page sin
 * tocar el código.
 */
const NAVIGATION: readonly NavigationSeed[] = [
  { label: 'Inicio', href: '/', position: 1 },
  { label: 'Nosotros', href: '/nosotros', position: 2 },
  { label: 'Servicios', href: '/servicios', position: 3 },
  { label: 'Contacto', href: '/contacto', position: 4 },
];

const GLOBAL_SETTINGS: Readonly<Record<string, string>> = {
  siteName: 'Web Builder Co.',
  tagline: 'Sitios dinámicos ensamblados al vuelo',
  contactEmail: 'contacto@webbuilder.co',
  contactPhone: '+56 9 1234 5678',
  whatsappNumber: '56912345678',
  address: 'Av. Providencia 1234, Santiago, Chile',
  instagramUrl: 'https://instagram.com/webbuilderco',
  facebookUrl: 'https://facebook.com/webbuilderco',
};

const PAGES: readonly PageSeed[] = [
  {
    slug: 'home',
    title: 'Inicio | Web Builder Co.',
    description: 'Creamos sitios web dinámicos y escalables para tu negocio.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Tu sitio web, ensamblado al vuelo',
          subtitle:
            'Landing pages dinámicas gestionadas 100% desde una base de datos. Cambia contenido, orden y diseño sin tocar el código.',
          ctaLabel: 'Conoce nuestros servicios',
          ctaHref: '/servicios',
        },
      },
      {
        type: 'Features',
        position: 2,
        anchor: 'caracteristicas',
        props: {
          title: '¿Por qué elegirnos?',
          items: [
            {
              icon: 'zap',
              title: 'Rápido',
              description:
                'Renderizado del lado del servidor con Next.js para una carga instantánea.',
            },
            {
              icon: 'layers',
              title: 'Flexible',
              description:
                'Bloques visuales reordenables desde la base de datos, sin despliegues.',
            },
            {
              icon: 'shield',
              title: 'Confiable',
              description:
                'Arquitectura limpia, validación estricta y pruebas automatizadas.',
            },
          ],
        },
      },
      {
        type: 'CallToAction',
        position: 3,
        props: {
          title: '¿Listo para empezar?',
          subtitle: 'Cuéntanos tu proyecto y te responderemos a la brevedad.',
          buttonLabel: 'Contáctanos',
          buttonHref: '/contacto',
        },
      },
    ],
  },
  {
    slug: 'nosotros',
    title: 'Nosotros | Web Builder Co.',
    description: 'Conoce al equipo detrás de Web Builder Co.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Sobre nosotros',
          subtitle:
            'Somos un equipo apasionado por construir experiencias web que evolucionan con tu negocio.',
        },
      },
      {
        type: 'TextBlock',
        position: 2,
        props: {
          title: 'Nuestra historia',
          content:
            'Nacimos con una idea simple: el contenido de un sitio web no debería vivir atrapado en el código. Por eso construimos un motor de renderizado dinámico donde cada página se ensambla a partir de bloques configurables, permitiendo a nuestros clientes evolucionar su presencia digital sin fricción técnica.',
        },
      },
      // Tipo desconocido a propósito: el frontend debe ignorarlo silenciosamente (AC1.5)
      { type: 'VideoGallery', position: 3, props: { videos: [] } },
      {
        type: 'CallToAction',
        position: 4,
        props: {
          title: 'Trabajemos juntos',
          subtitle: 'Escríbenos y llevemos tu proyecto al siguiente nivel.',
          buttonLabel: 'Ir al contacto',
          buttonHref: '/contacto',
        },
      },
    ],
  },
  {
    slug: 'servicios',
    title: 'Servicios | Web Builder Co.',
    description: 'Landing pages, sitios corporativos y más.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Nuestros servicios',
          subtitle: 'Soluciones web a la medida de tu negocio.',
        },
      },
      {
        type: 'Features',
        position: 2,
        props: {
          title: 'Lo que ofrecemos',
          items: [
            {
              icon: 'layout',
              title: 'Landing Pages',
              description:
                'Páginas de aterrizaje optimizadas para conversión, listas en días.',
            },
            {
              icon: 'globe',
              title: 'Sitios corporativos',
              description: 'Presencia digital profesional con contenido gestionable.',
            },
            {
              icon: 'shopping-cart',
              title: 'E-commerce (próximamente)',
              description: 'Tiendas en línea sobre la misma arquitectura headless.',
            },
          ],
        },
      },
      {
        type: 'CallToAction',
        position: 3,
        props: {
          title: '¿Te interesa alguno?',
          subtitle: 'Cuéntanos qué necesitas y te enviaremos una propuesta.',
          buttonLabel: 'Cotiza tu proyecto',
          buttonHref: '/contacto',
        },
      },
    ],
  },
  {
    slug: 'contacto',
    title: 'Contacto | Web Builder Co.',
    description: 'Escríbenos y conversemos sobre tu proyecto.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Contacto',
          subtitle:
            '¿Tienes un proyecto en mente? Escríbenos y te responderemos a la brevedad.',
        },
      },
      {
        type: 'ContactForm',
        position: 2,
        props: {
          title: 'Envíanos un mensaje',
          subtitle: 'Completa el formulario y nos pondremos en contacto contigo.',
        },
      },
    ],
  },
];

const seed = async (): Promise<void> => {
  for (const [key, value] of Object.entries(GLOBAL_SETTINGS)) {
    await prisma.globalSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  await prisma.navigationLink.deleteMany();
  await prisma.navigationLink.createMany({
    data: NAVIGATION.map((link) => ({
      label: link.label,
      href: link.href,
      position: link.position,
    })),
  });

  for (const page of PAGES) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        description: page.description,
        sections: {
          deleteMany: {},
          create: page.sections.map((section) => ({
            type: section.type,
            position: section.position,
            props: section.props,
            anchor: section.anchor ?? null,
          })),
        },
      },
      create: {
        slug: page.slug,
        title: page.title,
        description: page.description,
        sections: {
          create: page.sections.map((section) => ({
            type: section.type,
            position: section.position,
            props: section.props,
            anchor: section.anchor ?? null,
          })),
        },
      },
    });
  }

  console.log(
    `Seeded ${Object.keys(GLOBAL_SETTINGS).length} settings, ${NAVIGATION.length} nav links and ${PAGES.length} pages`,
  );
};

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

import type { NavigationLinkSeed } from './NavigationSeeder';
import type { PageSeed } from './PageSeeder';
import type { SeedAssetKeys } from './StorageAssetsSeeder';
import type { TenantSeedParams } from './TenantSeeder';

/**
 * Paleta del template. Los colores viven como valores hex/CSS dentro de
 * `props` — el frontend los aplica como estilos inline sin cambios de
 * esquema, así que cada tenant puede tener identidad propia solo con datos.
 */
export interface TemplatePalette {
  readonly primary: string;
  readonly primaryDark: string;
  readonly primarySoft: string;
  readonly primaryText: string;
  readonly secondary: string;
  readonly secondarySoft: string;
  readonly secondaryText: string;
  readonly tertiary: string;
  readonly tertiaryDark: string;
  readonly tertiarySoft: string;
  readonly tertiaryText: string;
  readonly heroOverlays: {
    readonly home: string;
    readonly nosotros: string;
    readonly servicios: string;
    readonly contacto: string;
  };
}

/** Índigo/violeta como identidad, teal para servicios (tenant principal). */
const DEFAULT_PALETTE: TemplatePalette = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primarySoft: '#eef2ff',
  primaryText: '#e0e7ff',
  secondary: '#7c3aed',
  secondarySoft: '#faf5ff',
  secondaryText: '#f5f3ff',
  tertiary: '#0d9488',
  tertiaryDark: '#0f766e',
  tertiarySoft: '#f0fdfa',
  tertiaryText: '#ccfbf1',
  heroOverlays: {
    home: 'rgba(30, 27, 75, 0.5)',
    nosotros: 'rgba(76, 29, 149, 0.45)',
    servicios: 'rgba(15, 23, 42, 0.45)',
    contacto: 'rgba(59, 7, 100, 0.45)',
  },
};

/** Variante cálida (rose/ámbar/cielo) para el tenant de demostración. */
const ACME_PALETTE: TemplatePalette = {
  primary: '#e11d48',
  primaryDark: '#be123c',
  primarySoft: '#fff1f2',
  primaryText: '#ffe4e6',
  secondary: '#d97706',
  secondarySoft: '#fffbeb',
  secondaryText: '#fef3c7',
  tertiary: '#0284c7',
  tertiaryDark: '#0369a1',
  tertiarySoft: '#f0f9ff',
  tertiaryText: '#e0f2fe',
  heroOverlays: {
    home: 'rgba(76, 5, 25, 0.55)',
    nosotros: 'rgba(120, 53, 15, 0.5)',
    servicios: 'rgba(12, 74, 110, 0.5)',
    contacto: 'rgba(76, 5, 25, 0.5)',
  },
};

/** Ámbar/azul/verde: identidad de la empresa eléctrica ElectroAndes. */
const ELECTRICA_PALETTE: TemplatePalette = {
  primary: '#f59e0b',
  primaryDark: '#b45309',
  primarySoft: '#fffbeb',
  primaryText: '#fef3c7',
  secondary: '#1d4ed8',
  secondarySoft: '#eff6ff',
  secondaryText: '#dbeafe',
  tertiary: '#059669',
  tertiaryDark: '#047857',
  tertiarySoft: '#ecfdf5',
  tertiaryText: '#d1fae5',
  heroOverlays: {
    home: 'rgba(15, 23, 42, 0.6)',
    nosotros: 'rgba(30, 41, 59, 0.55)',
    servicios: 'rgba(23, 37, 84, 0.55)',
    contacto: 'rgba(15, 23, 42, 0.55)',
  },
};

export const NAVIGATION_LINKS: readonly NavigationLinkSeed[] = [
  { label: 'Inicio', href: '/', position: 1 },
  { label: 'Nosotros', href: '/nosotros', position: 2 },
  { label: 'Servicios', href: '/servicios', position: 3 },
  { label: 'Contacto', href: '/contacto', position: 4 },
];

/** Páginas del template genérico de agencia (tenants `default` y `acme`). */
export const buildPages = (
  siteName: string,
  palette: TemplatePalette,
  assets: SeedAssetKeys | null,
): readonly PageSeed[] => [
  {
    slug: 'home',
    title: 'Inicio',
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
          ...(assets === null
            ? {}
            : { imageUrl: assets.heroHome, overlayColor: palette.heroOverlays.home }),
        },
      },
      {
        type: 'Features',
        position: 2,
        anchor: 'caracteristicas',
        props: {
          title: '¿Por qué elegirnos?',
          backgroundColor: palette.primarySoft,
          accentColor: palette.primary,
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
          backgroundColor: palette.primaryDark,
          textColor: palette.primaryText,
        },
      },
    ],
  },
  {
    slug: 'nosotros',
    title: 'Nosotros',
    description: `Conoce al equipo detrás de ${siteName}.`,
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Sobre nosotros',
          subtitle:
            'Somos un equipo apasionado por construir experiencias web que evolucionan con tu negocio.',
          ...(assets === null
            ? {}
            : {
                imageUrl: assets.heroNosotros,
                overlayColor: palette.heroOverlays.nosotros,
              }),
        },
      },
      {
        type: 'TextBlock',
        position: 2,
        props: {
          title: 'Nuestra historia',
          content:
            'Nacimos con una idea simple: el contenido de un sitio web no debería vivir atrapado en el código. Por eso construimos un motor de renderizado dinámico donde cada página se ensambla a partir de bloques configurables, permitiendo a nuestros clientes evolucionar su presencia digital sin fricción técnica.',
          backgroundColor: palette.secondarySoft,
          ...(assets === null
            ? {}
            : {
                imageUrl: assets.equipo,
                imageAlt: `Ilustración del equipo de ${siteName}`,
              }),
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
          backgroundColor: palette.secondary,
          textColor: palette.secondaryText,
        },
      },
    ],
  },
  {
    slug: 'servicios',
    title: 'Servicios',
    description: 'Landing pages, sitios corporativos y más.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Nuestros servicios',
          subtitle: 'Soluciones web a la medida de tu negocio.',
          ...(assets === null
            ? {}
            : {
                imageUrl: assets.heroServicios,
                overlayColor: palette.heroOverlays.servicios,
              }),
        },
      },
      {
        type: 'Features',
        position: 2,
        props: {
          title: 'Lo que ofrecemos',
          backgroundColor: palette.tertiarySoft,
          accentColor: palette.tertiary,
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
          backgroundColor: palette.tertiaryDark,
          textColor: palette.tertiaryText,
        },
      },
    ],
  },
  {
    slug: 'contacto',
    title: 'Contacto',
    description: 'Escríbenos y conversemos sobre tu proyecto.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Contacto',
          subtitle:
            '¿Tienes un proyecto en mente? Escríbenos y te responderemos a la brevedad.',
          ...(assets === null
            ? {}
            : {
                imageUrl: assets.heroContacto,
                overlayColor: palette.heroOverlays.contacto,
              }),
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

/**
 * Páginas del tenant `electrica`: contenido redactado desde la perspectiva
 * del cliente (empresa de servicios eléctricos), no de la agencia. Usa los
 * mismos bloques del motor (Hero, Stats, Features, TextBlock, CallToAction,
 * ContactForm) con textos, íconos y colores propios del rubro.
 */
export const buildElectricaPages = (
  palette: TemplatePalette,
  assets: SeedAssetKeys | null,
): readonly PageSeed[] => [
  {
    slug: 'home',
    title: 'Inicio',
    description:
      'Instalaciones eléctricas, mantención y emergencias 24/7 con instaladores autorizados SEC.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          eyebrow: 'Certificados SEC Clase A',
          title: 'Energía segura para',
          titleAccent: 'tu hogar y tu empresa',
          subtitle:
            'Instalaciones eléctricas, mantención preventiva y atención de emergencias 24/7, ejecutadas por instaladores autorizados SEC.',
          ctaLabel: 'Solicita tu cotización',
          ctaHref: '/contacto',
          secondaryCtaLabel: 'Ver servicios',
          secondaryCtaHref: '/servicios',
          accentColor: palette.primary,
          ...(assets === null
            ? {}
            : {
                // Carrusel: rota entre los tres heros del sitio, igual que la
                // referencia clonada (synovaingenieria.cl) para demostrar
                // la capacidad genérica del motor, no solo una imagen fija.
                images: [
                  assets.electricaHeroHome,
                  assets.electricaHeroServicios,
                  assets.electricaHeroNosotros,
                ],
                overlayColor: palette.heroOverlays.home,
              }),
        },
      },
      {
        type: 'Stats',
        position: 2,
        anchor: 'cifras',
        props: {
          backgroundColor: '#1e293b',
          textColor: '#e2e8f0',
          accentColor: '#fbbf24',
          items: [
            { value: '+15', label: 'Años de experiencia' },
            { value: '+1.200', label: 'Proyectos ejecutados' },
            { value: '24/7', label: 'Atención de emergencias' },
            { value: '100%', label: 'Trabajos certificados SEC' },
          ],
        },
      },
      {
        type: 'ServiceCards',
        position: 3,
        anchor: 'servicios-destacados',
        props: {
          title: 'Nuestros Servicios',
          subtitle: 'Excelencia técnica y compromiso en cada proyecto eléctrico.',
          accentColor: palette.primaryDark,
          items: [
            {
              icon: 'home',
              title: 'Instalaciones residenciales',
              description:
                'Instalaciones eléctricas completas para viviendas: canalización, cableado, tablero, protecciones, enchufes e iluminación.',
              checklist: [
                'Instalación completa de redes eléctricas domiciliarias',
                'Montaje de tableros eléctricos y protecciones',
                'Cumplimiento de normativa eléctrica vigente (SEC)',
              ],
              linkLabel: 'Instalaciones eléctricas',
              linkHref: '/contacto',
            },
            {
              icon: 'lightbulb',
              title: 'Estudio y diseño lumínico',
              description:
                'Estudios luminotécnicos con software DIALux Evo: niveles de iluminancia, uniformidad y cumplimiento normativo.',
              checklist: [
                'Simulación y cálculo lumínico con DIALux Evo',
                'Verificación de cumplimiento normativo',
                'Diagnóstico de instalaciones existentes',
              ],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
            {
              icon: 'factory',
              title: 'Instalaciones industriales',
              description:
                'Instalaciones eléctricas para plantas, bodegas y faenas: diseño, planificación y ejecución completa.',
              checklist: [
                'Diseño y ejecución de sistemas eléctricos industriales',
                'Montaje de tableros eléctricos y de control',
                'Canalizaciones, bandejas y distribución de carga',
              ],
              linkLabel: 'Agéndanos una reunión',
              linkHref: '/contacto',
            },
            {
              icon: 'badge-check',
              title: 'Certificación eléctrica TE1',
              description:
                'Regularizamos e instalamos empalmes eléctricos TE1, cumpliendo con la normativa SEC, sin trámites eternos.',
              checklist: ['Diagnóstico sin costo', 'Rapidez'],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
          ],
          viewAllLabel: 'Ver todos los servicios',
          viewAllHref: '/servicios',
        },
      },
      {
        type: 'SplitHighlights',
        position: 4,
        anchor: 'por-que-elegirnos',
        props: {
          title: '¿Por qué elegir a ElectroAndes?',
          backgroundColor: palette.primarySoft,
          accentColor: palette.primaryDark,
          ...(assets === null ? {} : { imageUrl: assets.electricaEquipo }),
          imageAlt: 'Electricista de ElectroAndes trabajando en un tablero',
          items: [
            {
              icon: 'badge-check',
              title: 'Instaladores Certificados SEC',
              description:
                'Todo nuestro personal cuenta con licencia SEC vigente, asegurando cumplimiento normativo total.',
            },
            {
              icon: 'clock',
              title: 'Respuesta Rápida y Puntualidad',
              description:
                'Valoramos tu tiempo. Llegamos a la hora acordada y entregamos los proyectos en los plazos establecidos.',
            },
            {
              icon: 'shield',
              title: 'Garantía en Todos los Trabajos',
              description:
                'Ofrecemos garantía escrita sobre la mano de obra y los materiales utilizados en cada instalación.',
            },
          ],
        },
      },
      {
        type: 'Testimonials',
        position: 5,
        props: {
          title: 'Lo que dicen nuestros clientes',
          accentColor: palette.primaryDark,
          items: [
            {
              badgeLabel: 'Instalación eléctrica · Ñuñoa',
              quote:
                'El equipo de ElectroAndes dejó el tablero de la casa nuevo, todo certificado y explicado paso a paso. Llegaron a la hora acordada y el trabajo quedó impecable.',
              rating: 5,
              authorName: 'Marcela Reyes',
              authorLocation: 'Ñuñoa, Santiago',
            },
            {
              badgeLabel: 'Mantención industrial · San Bernardo',
              quote:
                'Contratamos la mantención preventiva de nuestra bodega y el diagnóstico fue súper claro. Resolvieron una falla que llevaba meses sin que nadie diera con ella.',
              rating: 5,
              authorName: 'Rodrigo Salas',
              authorLocation: 'San Bernardo',
            },
            {
              badgeLabel: 'Certificación TE1 · Providencia',
              quote:
                'Necesitaba regularizar el empalme para vender el departamento y lo dejaron certificado en menos de una semana, sin vueltas.',
              rating: 5,
              authorName: 'Camila Ortiz',
              authorLocation: 'Providencia',
            },
          ],
        },
      },
      {
        type: 'CallToAction',
        position: 6,
        props: {
          title: '¿Cortes de luz o fallas recurrentes?',
          subtitle:
            'Nuestro equipo de emergencias está disponible las 24 horas, los 7 días de la semana.',
          buttonLabel: 'Contáctanos ahora',
          buttonHref: '/contacto',
          backgroundColor: palette.primaryDark,
          textColor: palette.primaryText,
          // Demuestra `backgroundImageUrl`: cualquier sección puede llevar
          // foto de fondo, no solo Hero. Reutiliza un asset ya en el bucket.
          ...(assets === null
            ? {}
            : {
                backgroundImageUrl: assets.electricaHeroContacto,
                backgroundOverlayColor: 'rgba(180, 83, 9, 0.75)',
              }),
        },
      },
    ],
  },
  {
    slug: 'nosotros',
    title: 'Nosotros',
    description:
      'Más de 15 años entregando soluciones eléctricas seguras y certificadas.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Somos ElectroAndes',
          subtitle:
            'Más de 15 años entregando soluciones eléctricas seguras y certificadas para hogares, comercios e industria.',
          ...(assets === null
            ? {}
            : {
                imageUrl: assets.electricaHeroNosotros,
                overlayColor: palette.heroOverlays.nosotros,
              }),
        },
      },
      {
        type: 'TextBlock',
        position: 2,
        props: {
          title: 'Nuestra historia',
          content:
            'Partimos el 2010 como un taller familiar en Santiago y hoy somos un equipo de más de 40 técnicos e ingenieros eléctricos. Hemos electrificado casas, comercios y plantas industriales a lo largo de Chile, siempre con el mismo compromiso: trabajos seguros, certificados ante la SEC y entregados a tiempo.',
          backgroundColor: palette.secondarySoft,
          ...(assets === null
            ? {}
            : {
                imageUrl: assets.electricaEquipo,
                imageAlt: 'Ilustración del equipo técnico de ElectroAndes',
              }),
        },
      },
      {
        type: 'Features',
        position: 3,
        anchor: 'valores',
        props: {
          title: 'Nuestros valores',
          backgroundColor: palette.tertiarySoft,
          accentColor: palette.tertiary,
          items: [
            {
              icon: 'shield',
              title: 'Seguridad primero',
              description:
                'Cada faena parte con un análisis de riesgo y termina con protocolos de verificación.',
            },
            {
              icon: 'badge-check',
              title: 'Calidad certificada',
              description:
                'Todos nuestros trabajos quedan respaldados con su declaración TE1 ante la SEC.',
            },
            {
              icon: 'zap',
              title: 'Respuesta rápida',
              description:
                'Cuadrillas distribuidas en la ciudad para llegar rápido donde nos necesites.',
            },
          ],
        },
      },
      {
        type: 'CallToAction',
        position: 4,
        props: {
          title: 'Conversemos de tu proyecto',
          subtitle:
            'Cuéntanos qué necesitas y un ingeniero te contactará dentro del día.',
          buttonLabel: 'Ir al contacto',
          buttonHref: '/contacto',
          backgroundColor: palette.secondary,
          textColor: palette.secondaryText,
        },
      },
    ],
  },
  {
    slug: 'servicios',
    title: 'Servicios',
    description:
      'Instalaciones, mantención industrial, empalmes, energía solar y certificaciones eléctricas.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          title: 'Nuestros servicios',
          subtitle:
            'Del empalme a la iluminación: soluciones eléctricas integrales para hogares, comercios e industria.',
          ...(assets === null
            ? {}
            : {
                imageUrl: assets.electricaHeroServicios,
                overlayColor: palette.heroOverlays.servicios,
              }),
        },
      },
      {
        type: 'ServiceCards',
        position: 2,
        anchor: 'soluciones',
        props: {
          title: 'Soluciones para cada necesidad',
          backgroundColor: palette.primarySoft,
          accentColor: palette.primaryDark,
          items: [
            {
              icon: 'home',
              title: 'Instalaciones residenciales',
              description:
                'Proyectos eléctricos completos para casas y edificios, con su declaración TE1 incluida.',
              checklist: [
                'Canalización, cableado y tablero',
                'Enchufes, iluminación y circuitos',
              ],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
            {
              icon: 'factory',
              title: 'Mantención industrial',
              description:
                'Planes preventivos y correctivos para tableros, motores y líneas de producción.',
              checklist: ['Diagnóstico de fallas', 'Planes de mantención periódica'],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
            {
              icon: 'plug-zap',
              title: 'Empalmes y aumentos de potencia',
              description:
                'Gestión completa ante la distribuidora para que tu proyecto tenga la energía que necesita.',
              checklist: [
                'Trámite ante la distribuidora',
                'Aumento de potencia contratada',
              ],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
            {
              icon: 'sun',
              title: 'Energía solar',
              description:
                'Diseño e instalación de sistemas fotovoltaicos on-grid, con trámite ante la SEC.',
              checklist: [
                'Diseño del sistema fotovoltaico',
                'Trámite de conexión ante la SEC',
              ],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
            {
              icon: 'lightbulb',
              title: 'Iluminación LED',
              description:
                'Recambio y diseño lumínico eficiente para comercios, bodegas y áreas comunes.',
              checklist: ['Cálculo lumínico con DIALux Evo', 'Recambio a tecnología LED'],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
            {
              icon: 'gauge',
              title: 'Certificaciones y mediciones',
              description:
                'Certificación de instalaciones, mediciones de tierra y termografía de tableros.',
              checklist: ['Mediciones de puesta a tierra', 'Termografía de tableros'],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
            {
              icon: 'thermometer',
              title: 'Termografía eléctrica',
              description:
                'Detectamos fallas y conexiones defectuosas antes de que se transformen en un corte o un incendio.',
              checklist: [
                'Inspección termográfica de tableros',
                'Informe con puntos críticos',
              ],
              linkLabel: 'Agenda tu termografía',
              linkHref: '/contacto',
            },
            {
              icon: 'wrench',
              title: 'Mantención preventiva y correctiva',
              description:
                'Inspecciones y reparaciones programadas para evitar fallas y tiempos de inactividad.',
              checklist: ['Detección temprana de fallas', 'Informes técnicos detallados'],
              linkLabel: 'Cotizar',
              linkHref: '/contacto',
            },
            {
              icon: 'badge-check',
              title: 'Regulariza tu instalación',
              description:
                'Si tu instalación no cumple con la normativa vigente, la evaluamos y dejamos todo en regla ante la SEC.',
              checklist: [
                'Evaluación completa en terreno',
                'Gestión de documentación SEC',
              ],
              linkLabel: 'Solicita tu regularización',
              linkHref: '/contacto',
            },
          ],
        },
      },
      {
        type: 'Features',
        position: 3,
        anchor: 'sectores',
        props: {
          eyebrow: 'Sectores que atendemos',
          title: 'Experiencia en todos los niveles',
          variant: 'plain',
          accentColor: palette.primaryDark,
          items: [
            {
              icon: 'home',
              title: 'Residencial',
              description:
                'Seguridad para tu hogar. Desde cambio de enchufes hasta cableado completo de casas y departamentos.',
            },
            {
              icon: 'layout',
              title: 'Comercial',
              description:
                'Soluciones para oficinas y locales. Iluminación eficiente y circuitos pensados para la operación diaria.',
            },
            {
              icon: 'factory',
              title: 'Industrial',
              description:
                'Alta potencia y trifásica. Mantención de maquinaria y tableros de fuerza industrial.',
            },
          ],
        },
      },
      {
        type: 'Stats',
        position: 4,
        props: {
          backgroundColor: '#1e293b',
          textColor: '#e2e8f0',
          accentColor: '#fbbf24',
          items: [
            { value: '+300', label: 'Empalmes gestionados' },
            { value: '+2.500', label: 'Declaraciones TE1 tramitadas' },
            { value: '98%', label: 'Clientes que nos recomiendan' },
          ],
        },
      },
      {
        type: 'CallToAction',
        position: 5,
        props: {
          title: '¿No encuentras lo que buscas?',
          subtitle: 'Cuéntanos tu caso: armamos soluciones a la medida de cada cliente.',
          buttonLabel: 'Cotiza tu proyecto',
          buttonHref: '/contacto',
          backgroundColor: palette.tertiaryDark,
          textColor: palette.tertiaryText,
        },
      },
    ],
  },
  {
    slug: 'contacto',
    title: 'Contacto',
    description: 'Cotizaciones, visitas técnicas y emergencias eléctricas: escríbenos.',
    sections: [
      {
        type: 'Hero',
        position: 1,
        props: {
          eyebrow: 'Atención al cliente',
          title: 'Contáctanos',
          subtitle:
            'Cotizaciones, visitas técnicas y emergencias: escríbenos y te respondemos dentro del día.',
          ...(assets === null
            ? {}
            : {
                imageUrl: assets.electricaHeroContacto,
                overlayColor: palette.heroOverlays.contacto,
              }),
        },
      },
      {
        type: 'ContactForm',
        position: 2,
        props: {
          title: 'Cuéntanos tu proyecto',
          subtitle:
            'Completa el formulario y un técnico se pondrá en contacto contigo. Para emergencias, usa el botón de WhatsApp.',
          accentColor: palette.primaryDark,
          channels: [
            {
              type: 'phone',
              title: 'Llámanos',
              description: 'Atención inmediata para proyectos y cotizaciones.',
              value: '+56 9 6543 2109',
            },
            {
              type: 'whatsapp',
              title: 'WhatsApp',
              description: 'Chatea con un técnico ahora, ideal para emergencias.',
              value: '56965432109',
              linkLabel: 'Iniciar chat',
            },
            {
              type: 'email',
              title: 'Email',
              description: 'Envíanos tus planos, dudas o solicitudes de cotización.',
              value: 'contacto@electroandes.cl',
            },
            {
              type: 'hours',
              title: 'Horario de atención',
              description:
                'Cotizaciones y visitas técnicas. Para emergencias, escríbenos por WhatsApp a cualquier hora.',
              schedule: [
                { day: 'Lunes a viernes', hours: '08:30 – 18:30' },
                { day: 'Sábado', hours: '09:00 – 13:00' },
                { day: 'Domingo', hours: 'Cerrado' },
              ],
            },
          ],
        },
      },
      {
        type: 'LocationMap',
        position: 3,
        props: {
          title: 'Dónde estamos',
          address: 'Av. Vicuña Mackenna 2890, Ñuñoa, Santiago, Chile',
          accentColor: palette.primaryDark,
        },
      },
    ],
  },
];

/** Configuración completa de un tenant a sembrar. */
export interface TenantTemplate {
  readonly tenant: TenantSeedParams;
  readonly settings: Readonly<Record<string, string>>;
  readonly navigation: readonly NavigationLinkSeed[];
  /** Cada tenant decide sus páginas: el motor solo renderiza lo que la BD dicte. */
  readonly buildPages: (assets: SeedAssetKeys | null) => readonly PageSeed[];
}

export const TENANT_TEMPLATES: readonly TenantTemplate[] = [
  {
    tenant: {
      slug: 'default',
      name: 'Web Builder Co.',
      domains: ['localhost', '127.0.0.1'],
    },
    settings: {
      siteName: 'Web Builder Co.',
      tagline: 'Sitios dinámicos ensamblados al vuelo',
      contactEmail: 'contacto@webbuilder.co',
      contactPhone: '+56 9 1234 5678',
      whatsappNumber: '56912345678',
      address: 'Av. Providencia 1234, Santiago, Chile',
      instagramUrl: 'https://instagram.com/webbuilderco',
      facebookUrl: 'https://facebook.com/webbuilderco',
    },
    navigation: NAVIGATION_LINKS,
    buildPages: (assets) => buildPages('Web Builder Co.', DEFAULT_PALETTE, assets),
  },
  {
    // Tenant de demostración: mismo motor, otra marca. En el navegador se
    // resuelve visitando http://acme.localhost:3100 (los subdominios de
    // localhost apuntan a 127.0.0.1 sin tocar /etc/hosts). El segundo dominio
    // simula el caso "el cliente compró su propio dominio": la misma marca
    // responde por http://acme-estudio.localhost:3100 sin duplicar contenido.
    tenant: {
      slug: 'acme',
      name: 'Acme Estudio',
      domains: ['acme.localhost', 'acme-estudio.localhost'],
    },
    settings: {
      siteName: 'Acme Estudio',
      tagline: 'Diseño web con carácter',
      contactEmail: 'hola@acme.cl',
      contactPhone: '+56 9 8765 4321',
      whatsappNumber: '56987654321',
      address: 'Av. Apoquindo 4500, Las Condes, Chile',
      instagramUrl: 'https://instagram.com/acmeestudio',
      facebookUrl: 'https://facebook.com/acmeestudio',
    },
    navigation: NAVIGATION_LINKS,
    buildPages: (assets) => buildPages('Acme Estudio', ACME_PALETTE, assets),
  },
  {
    // Cliente real del rubro eléctrico: contenido, paleta y assets propios.
    // Se visita en http://electrica.localhost:3100 (o sin puerto vía Caddy).
    tenant: {
      slug: 'electrica',
      name: 'ElectroAndes',
      domains: ['electrica.localhost'],
    },
    settings: {
      siteName: 'ElectroAndes',
      tagline: 'Instalaciones y mantención eléctrica certificada SEC',
      contactEmail: 'contacto@electroandes.cl',
      contactPhone: '+56 9 6543 2109',
      whatsappNumber: '56965432109',
      address: 'Av. Vicuña Mackenna 2890, Ñuñoa, Santiago, Chile',
      instagramUrl: 'https://instagram.com/electroandescl',
      facebookUrl: 'https://facebook.com/electroandescl',
    },
    navigation: NAVIGATION_LINKS,
    buildPages: (assets) => buildElectricaPages(ELECTRICA_PALETTE, assets),
  },
];

import type { SiteTemplate } from '../SiteTemplate';

// Kit para constructoras y empresas de remodelación: obra nueva, ampliaciones y proyectos.
export const CONSTRUCCION_TEMPLATE: SiteTemplate = {
  id: 'construccion',
  label: 'Construcción',
  industry: 'Construcción',
  description:
    'Para constructoras y empresas de remodelación que ejecutan obra nueva y ampliaciones.',
  brand: {
    palette: { primary: '#0c4a6e', secondary: '#c2410c', accent: '#facc15' },
    typography: { pairing: 'montserrat-open-sans', scale: 'normal' },
    colorMode: 'light',
    visualStyle: 'classic',
  },
  settings: {
    siteName: 'Constructora Andes Sur',
    tagline: 'Obra nueva, ampliaciones y remodelaciones',
    contactEmail: 'contacto@andessur.cl',
    contactPhone: '+56 9 3456 7891',
    whatsappNumber: '56934567891',
    address: 'Camino a Melipilla 5200, Bodega 12, Maipú, Santiago, Chile',
    instagramUrl: 'https://instagram.com/andessurconstructora',
    linkedinUrl: 'https://linkedin.com/company/andes-sur-constructora',
  },
  navigation: [
    { label: 'Inicio', href: '/' },
    { label: 'Proyectos', href: '/proyectos' },
    { label: 'Servicios', href: '/servicios' },
    { label: 'Contacto', href: '/contacto' },
  ],
  pages: [
    {
      slug: 'home',
      title: 'Inicio',
      description:
        'Obra nueva, ampliaciones y remodelaciones ejecutadas con plazos y presupuesto claros.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Constructora con más de 15 años',
            title: 'Construimos con',
            titleAccent: 'plazos y presupuestos claros',
            subtitle:
              'Obra nueva, ampliaciones y remodelaciones para hogares y empresas, con seguimiento semanal de avance de obra.',
            ctaLabel: 'Solicita tu cotización',
            ctaHref: '/contacto',
            secondaryCtaLabel: 'Ver proyectos',
            secondaryCtaHref: '/proyectos',
            accentColor: '#c2410c',
            variant: 'centered',
          },
        },
        {
          type: 'Stats',
          anchor: 'cifras',
          props: {
            backgroundColor: '#0c4a6e',
            textColor: '#e0f2fe',
            accentColor: '#facc15',
            items: [
              { value: '+15', label: 'Años de experiencia' },
              { value: '+180', label: 'Proyectos entregados' },
              { value: '0', label: 'Multas por atraso en 2024' },
              { value: '100%', label: 'Contratos con precio cerrado' },
            ],
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'servicios-destacados',
          props: {
            title: 'Qué construimos',
            accentColor: '#0c4a6e',
            items: [
              {
                icon: 'home',
                title: 'Obra nueva residencial',
                description:
                  'Casas completas desde los cimientos, con proyecto de arquitectura propio o del cliente.',
                checklist: [
                  'Permisos municipales incluidos',
                  'Contrato a precio cerrado',
                ],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'layout',
                title: 'Ampliaciones',
                description:
                  'Segundo piso, quinchos, logias y ampliaciones de living-comedor.',
                checklist: [
                  'Regularización ante la DOM',
                  'Plazos definidos por contrato',
                ],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'wrench',
                title: 'Remodelaciones',
                description:
                  'Baños, cocinas y remodelaciones completas de departamentos y casas.',
                checklist: ['Diseño incluido', 'Obra limpia y protegida'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'factory',
                title: 'Obras comerciales',
                description: 'Habilitación de locales, oficinas y bodegas para empresas.',
                checklist: [
                  'Coordinación con arriendo/operación',
                  'Entrega llave en mano',
                ],
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
          anchor: 'por-que-elegirnos',
          props: {
            eyebrow: '¿Por qué elegirnos?',
            title: 'Construcción sin sorpresas',
            accentColor: '#c2410c',
            items: [
              {
                icon: 'badge-check',
                title: 'Contrato a precio cerrado',
                description:
                  'Firmamos un contrato con precio y plazo definidos, sin cobros sorpresa a mitad de obra.',
              },
              {
                icon: 'clock',
                title: 'Seguimiento semanal',
                description:
                  'Te enviamos un informe de avance cada semana, con fotos y estado de la obra.',
              },
              {
                icon: 'shield',
                title: 'Equipo propio, sin subcontratos',
                description:
                  'Nuestras cuadrillas trabajan directamente para nosotros, sin intermediarios.',
              },
            ],
          },
        },
        {
          type: 'Testimonials',
          props: {
            title: 'Lo que dicen nuestros clientes',
            accentColor: '#0c4a6e',
            items: [
              {
                badgeLabel: 'Ampliación de segundo piso · Maipú',
                quote:
                  'Cumplieron el plazo pactado y el precio no cambió en toda la obra. El informe semanal nos dio mucha tranquilidad.',
                rating: 5,
                authorName: 'Carlos Espinoza',
                authorLocation: 'Maipú, Santiago',
              },
              {
                badgeLabel: 'Remodelación de cocina · Peñalolén',
                quote:
                  'La cuadrilla fue súper prolija, dejaron la obra protegida todos los días. Excelente terminación.',
                rating: 5,
                authorName: 'Loreto Sandoval',
                authorLocation: 'Peñalolén, Santiago',
              },
              {
                badgeLabel: 'Habilitación de local comercial · Santiago Centro',
                quote:
                  'Necesitábamos abrir en seis semanas y lo lograron. Coordinaron todo con el arrendador sin problemas.',
                rating: 5,
                authorName: 'Felipe Aránguiz',
                authorLocation: 'Santiago Centro',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿Tienes un proyecto en mente?',
            subtitle:
              'Cuéntanos el alcance y te enviamos una cotización con precio y plazo definidos.',
            buttonLabel: 'Solicitar cotización',
            buttonHref: '/contacto',
            backgroundColor: '#0c4a6e',
            textColor: '#e0f2fe',
          },
        },
      ],
    },
    {
      slug: 'proyectos',
      title: 'Proyectos',
      description:
        'Casas, ampliaciones y obras comerciales entregadas en la Región Metropolitana.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Proyectos entregados',
            title: 'Obras que hablan por nosotros',
            subtitle:
              'Una muestra de los proyectos que hemos ejecutado en los últimos años.',
            variant: 'minimal',
            accentColor: '#c2410c',
          },
        },
        {
          type: 'Columns',
          anchor: 'casos',
          props: {
            title: 'Casos destacados',
            subtitle:
              'Cada proyecto incluye seguimiento fotográfico semanal para el cliente.',
            accentColor: '#0c4a6e',
            columns: [
              {
                eyebrow: 'Obra nueva · Colina',
                title: 'Casa de 180 m² en dos pisos',
                content:
                  'Construcción completa en seis meses, desde fundaciones hasta terminaciones.',
              },
              {
                eyebrow: 'Ampliación · Maipú',
                title: 'Segundo piso con dos dormitorios',
                content:
                  'Ampliación de 60 m² entregada en diez semanas, sin detener la vida familiar.',
              },
              {
                eyebrow: 'Remodelación · Ñuñoa',
                title: 'Departamento completo renovado',
                content:
                  'Cambio de cocina, baños y pisos en un departamento de 90 m², en cinco semanas.',
              },
              {
                eyebrow: 'Obra comercial · Santiago Centro',
                title: 'Habilitación de local de 250 m²',
                content:
                  'Entrega llave en mano coordinada con el proceso de arriendo del local.',
              },
            ],
          },
        },
        {
          type: 'Stats',
          props: {
            backgroundColor: '#1e293b',
            textColor: '#e2e8f0',
            accentColor: '#facc15',
            items: [
              { value: '+180', label: 'Proyectos entregados' },
              { value: '+40.000 m²', label: 'Construidos en total' },
              { value: '98%', label: 'Clientes que nos recomiendan' },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿Quieres ver más detalle de un proyecto?',
            subtitle:
              'Cuéntanos qué tipo de obra te interesa y te mostramos casos similares.',
            buttonLabel: 'Conversemos',
            buttonHref: '/contacto',
            backgroundColor: '#c2410c',
            textColor: '#fff7ed',
          },
        },
      ],
    },
    {
      slug: 'servicios',
      title: 'Servicios',
      description: 'Obra nueva, ampliaciones, remodelaciones y obras comerciales.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Nuestros servicios',
            title: 'De los cimientos a la entrega final',
            subtitle:
              'Ejecutamos proyectos completos, con proyecto de arquitectura propio o del cliente.',
            variant: 'minimal',
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'catalogo',
          props: {
            title: 'Nuestros servicios',
            accentColor: '#0c4a6e',
            items: [
              {
                icon: 'home',
                title: 'Obra nueva residencial',
                description:
                  'Casas completas desde los cimientos, con permisos municipales incluidos.',
                checklist: [
                  'Proyecto de arquitectura opcional',
                  'Contrato a precio cerrado',
                ],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'layout',
                title: 'Ampliaciones',
                description:
                  'Segundo piso, quinchos, logias y ampliaciones de living-comedor.',
                checklist: ['Regularización ante la DOM'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'wrench',
                title: 'Remodelación de baños y cocinas',
                description:
                  'Cambio completo de instalaciones, terminaciones y muebles a medida.',
                checklist: ['Diseño incluido'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'factory',
                title: 'Obras comerciales',
                description: 'Habilitación de locales, oficinas y bodegas para empresas.',
                checklist: ['Entrega llave en mano'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'shield',
                title: 'Impermeabilización y techumbre',
                description:
                  'Reparación y renovación de techumbres, cubiertas y sistemas de drenaje.',
                checklist: ['Garantía escrita por 2 años'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'gauge',
                title: 'Inspección técnica',
                description:
                  'Evaluación de estructuras antes de comprar o ampliar una propiedad.',
                checklist: ['Informe técnico detallado'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
            ],
          },
        },
        {
          type: 'Features',
          anchor: 'sectores',
          props: {
            eyebrow: 'A quién atendemos',
            title: 'Familias y empresas',
            variant: 'plain',
            accentColor: '#c2410c',
            items: [
              {
                icon: 'home',
                title: 'Familias',
                description: 'Casas, ampliaciones y remodelaciones para tu hogar.',
              },
              {
                icon: 'layout',
                title: 'Empresas',
                description: 'Habilitación de oficinas, locales y bodegas.',
              },
              {
                icon: 'factory',
                title: 'Inmobiliarias',
                description: 'Ejecución de proyectos por etapas para desarrolladores.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: 'Conversemos sobre tu obra',
            subtitle:
              'Envíanos los planos o cuéntanos la idea y te respondemos con una propuesta.',
            buttonLabel: 'Solicitar cotización',
            buttonHref: '/contacto',
            backgroundColor: '#0c4a6e',
            textColor: '#e0f2fe',
          },
        },
      ],
    },
    {
      slug: 'contacto',
      title: 'Contacto',
      description: 'Solicita una visita técnica o una cotización para tu proyecto.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Cotiza tu proyecto',
            title: 'Contáctanos',
            subtitle:
              'Cuéntanos el alcance de tu obra y agendamos una visita técnica sin costo.',
            variant: 'minimal',
          },
        },
        {
          type: 'ContactForm',
          props: {
            title: 'Cuéntanos tu proyecto',
            subtitle:
              'Completa el formulario y un jefe de obra te contactará dentro del día.',
            accentColor: '#0c4a6e',
            channels: [
              {
                type: 'phone',
                title: 'Llámanos',
                description: 'Atención directa para cotizaciones.',
                value: '+56 9 3456 7891',
              },
              {
                type: 'whatsapp',
                title: 'WhatsApp',
                description: 'Envíanos planos o fotos del lugar.',
                value: '56934567891',
                linkLabel: 'Iniciar chat',
              },
              {
                type: 'email',
                title: 'Email',
                description: 'Para licitaciones o proyectos de mayor tamaño.',
                value: 'contacto@andessur.cl',
              },
              {
                type: 'hours',
                title: 'Horario de atención',
                description: 'Visitas técnicas coordinadas según disponibilidad.',
                schedule: [
                  { day: 'Lunes a viernes', hours: '08:00 – 18:00' },
                  { day: 'Sábado', hours: '09:00 – 13:00' },
                  { day: 'Domingo', hours: 'Cerrado' },
                ],
              },
            ],
          },
        },
        {
          type: 'LocationMap',
          props: {
            title: 'Nuestras oficinas',
            address: 'Camino a Melipilla 5200, Bodega 12, Maipú, Santiago, Chile',
            accentColor: '#0c4a6e',
          },
        },
      ],
    },
  ],
};

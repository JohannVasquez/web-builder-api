import type { SiteTemplate } from '../SiteTemplate';

// Kit para técnicos a domicilio: refrigeración, lavadoras, aire acondicionado y calefont.
export const SERVICIOS_TECNICOS_TEMPLATE: SiteTemplate = {
  id: 'servicios-tecnicos',
  label: 'Servicios técnicos',
  industry: 'Servicios técnicos',
  description:
    'Para técnicos y talleres que reparan a domicilio: refrigeración, lavadoras, aire acondicionado y calefont.',
  brand: {
    palette: { primary: '#1e3a8a', secondary: '#f97316', accent: '#facc15' },
    typography: { pairing: 'oswald-lato', scale: 'normal' },
    colorMode: 'light',
    visualStyle: 'classic',
  },
  settings: {
    siteName: 'ServiTec Hogar',
    tagline: 'Reparación de equipos a domicilio, el mismo día',
    contactEmail: 'contacto@servitechogar.cl',
    contactPhone: '+56 9 5123 4567',
    whatsappNumber: '56951234567',
    address: 'Av. Irarrázaval 3100, Ñuñoa, Santiago, Chile',
    instagramUrl: 'https://instagram.com/servitechogar',
    facebookUrl: 'https://facebook.com/servitechogar',
  },
  navigation: [
    { label: 'Inicio', href: '/' },
    { label: 'Servicios', href: '/servicios' },
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Contacto', href: '/contacto' },
  ],
  pages: [
    {
      slug: 'home',
      title: 'Inicio',
      description:
        'Servicio técnico a domicilio para refrigeración, lavadoras y climatización.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Técnicos certificados',
            title: 'Reparamos tus equipos',
            titleAccent: 'el mismo día',
            subtitle:
              'Refrigeradores, lavadoras, aire acondicionado y calefont. Diagnóstico sin costo y garantía escrita en cada visita.',
            ctaLabel: 'Solicita tu visita técnica',
            ctaHref: '/contacto',
            secondaryCtaLabel: 'Ver servicios',
            secondaryCtaHref: '/servicios',
            accentColor: '#f97316',
            variant: 'centered',
          },
        },
        {
          type: 'Stats',
          anchor: 'cifras',
          props: {
            backgroundColor: '#0f172a',
            textColor: '#e2e8f0',
            accentColor: '#facc15',
            items: [
              { value: '+12', label: 'Años de experiencia' },
              { value: '+4.000', label: 'Equipos reparados' },
              { value: '24 hrs', label: 'Tiempo de respuesta' },
              { value: '95%', label: 'Reparaciones en la primera visita' },
            ],
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'que-reparamos',
          props: {
            title: 'Qué reparamos',
            subtitle: 'Marcas y modelos de línea blanca, climatización y calefacción.',
            accentColor: '#1e3a8a',
            items: [
              {
                icon: 'thermometer',
                title: 'Refrigeradores y freezers',
                description:
                  'No enfría, hace ruido o tiene fugas de agua: diagnóstico y repuestos originales.',
                checklist: ['Diagnóstico sin costo', 'Repuestos originales'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'zap',
                title: 'Lavadoras y secadoras',
                description:
                  'Fugas, no centrifuga, no enciende o hace ruido en el ciclo de lavado.',
                checklist: ['Revisión de motor y bomba', 'Garantía escrita de 90 días'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'sun',
                title: 'Aire acondicionado',
                description:
                  'Instalación, carga de gas, limpieza y mantención de equipos split.',
                checklist: ['Carga de gas certificada', 'Limpieza de filtros y ducto'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'wrench',
                title: 'Calefont y termos',
                description:
                  'Revisión de encendido, fugas de gas y mantención preventiva anual.',
                checklist: ['Revisión de seguridad', 'Mantención preventiva'],
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
            title: 'Trabajo serio, sin sorpresas',
            accentColor: '#f97316',
            items: [
              {
                icon: 'badge-check',
                title: 'Técnicos certificados',
                description:
                  'Todo nuestro equipo cuenta con capacitación de fábrica en las principales marcas.',
              },
              {
                icon: 'clock',
                title: 'Llegamos cuando decimos',
                description:
                  'Coordinamos una ventana horaria y te avisamos por WhatsApp cuando el técnico va en camino.',
              },
              {
                icon: 'shield',
                title: 'Garantía escrita',
                description:
                  'Cada reparación queda respaldada por 90 días en mano de obra y repuestos.',
              },
            ],
          },
        },
        {
          type: 'Testimonials',
          props: {
            title: 'Lo que dicen nuestros clientes',
            accentColor: '#1e3a8a',
            items: [
              {
                badgeLabel: 'Refrigerador · Ñuñoa',
                quote:
                  'Llegaron el mismo día, encontraron la falla en minutos y no me cobraron por piezas que no necesitaba. Muy honestos.',
                rating: 5,
                authorName: 'Paula Contreras',
                authorLocation: 'Ñuñoa, Santiago',
              },
              {
                badgeLabel: 'Aire acondicionado · La Reina',
                quote:
                  'Nos instalaron dos equipos split en un día, dejaron todo limpio y nos explicaron cómo hacer la mantención.',
                rating: 5,
                authorName: 'Francisco Muñoz',
                authorLocation: 'La Reina, Santiago',
              },
              {
                badgeLabel: 'Lavadora · Macul',
                quote:
                  'La lavadora quedó como nueva y el técnico fue súper claro con el diagnóstico. Volvería a llamarlos sin dudar.',
                rating: 5,
                authorName: 'Daniela Soto',
                authorLocation: 'Macul, Santiago',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿Tu equipo dejó de funcionar?',
            subtitle:
              'Agenda tu visita técnica hoy y te llamamos para confirmar el horario.',
            buttonLabel: 'Agendar visita',
            buttonHref: '/contacto',
            backgroundColor: '#1e3a8a',
            textColor: '#dbeafe',
          },
        },
      ],
    },
    {
      slug: 'servicios',
      title: 'Servicios',
      description:
        'Reparación y mantención de línea blanca, climatización y calefacción.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Catálogo de servicios',
            title: 'Reparación y mantención a domicilio',
            subtitle:
              'Trabajamos con las principales marcas del mercado, en Santiago y alrededores.',
            variant: 'minimal',
            accentColor: '#f97316',
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'catalogo',
          props: {
            title: 'Nuestros servicios',
            accentColor: '#1e3a8a',
            items: [
              {
                icon: 'thermometer',
                title: 'Refrigeración',
                description: 'Refrigeradores, freezers y bodegas frías domésticas.',
                checklist: ['Diagnóstico sin costo', 'Carga de gas refrigerante'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'zap',
                title: 'Línea blanca',
                description: 'Lavadoras, secadoras y lavavajillas de toda marca.',
                checklist: [
                  'Revisión de tarjeta electrónica',
                  'Cambio de piezas de desgaste',
                ],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'sun',
                title: 'Climatización',
                description:
                  'Instalación y mantención de aire acondicionado split e inverter.',
                checklist: ['Instalación certificada', 'Limpieza de filtros y ducto'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'wrench',
                title: 'Calefacción',
                description: 'Calefont, termos eléctricos y estufas a gas.',
                checklist: [
                  'Revisión de seguridad de gas',
                  'Mantención preventiva anual',
                ],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'gauge',
                title: 'Mantención preventiva',
                description:
                  'Planes anuales para hogares y edificios, evita reparaciones de urgencia.',
                checklist: ['Revisión programada', 'Informe técnico por equipo'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Instalación de equipos nuevos',
                description:
                  'Instalamos el equipo que compraste, con garantía sobre la instalación.',
                checklist: [
                  'Instalación según norma del fabricante',
                  'Retiro de equipo antiguo',
                ],
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
            eyebrow: 'Dónde trabajamos',
            title: 'Hogares, oficinas y comercios',
            variant: 'plain',
            accentColor: '#1e3a8a',
            items: [
              {
                icon: 'home',
                title: 'Hogares',
                description:
                  'Atención rápida para la casa: de la refrigeradora al calefont.',
              },
              {
                icon: 'layout',
                title: 'Oficinas',
                description:
                  'Mantención de aire acondicionado y equipos de cocina para oficinas.',
              },
              {
                icon: 'factory',
                title: 'Comercios',
                description:
                  'Vitrinas refrigeradas, cámaras frías y climatización de locales.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿No encuentras tu equipo en la lista?',
            subtitle: 'Cuéntanos qué necesitas reparar y te decimos si podemos ayudarte.',
            buttonLabel: 'Escríbenos',
            buttonHref: '/contacto',
            backgroundColor: '#f97316',
            textColor: '#fff7ed',
          },
        },
      ],
    },
    {
      slug: 'nosotros',
      title: 'Nosotros',
      description: 'Más de una década reparando equipos a domicilio en Santiago.',
      sections: [
        {
          type: 'Hero',
          props: {
            title: 'Somos ServiTec Hogar',
            subtitle:
              'Un equipo de técnicos con más de una década reparando equipos a domicilio en Santiago.',
            variant: 'minimal',
          },
        },
        {
          type: 'TextBlock',
          props: {
            title: 'Nuestra historia',
            content:
              'Partimos el 2013 como un taller de barrio en Ñuñoa reparando refrigeradores. Con el tiempo sumamos línea blanca, climatización y calefacción, y hoy somos un equipo de doce técnicos que atiende toda la Región Metropolitana, siempre con el mismo compromiso: diagnóstico honesto y trabajo garantizado.',
            backgroundColor: '#eff6ff',
          },
        },
        {
          type: 'Columns',
          anchor: 'como-trabajamos',
          props: {
            title: 'Cómo trabajamos',
            subtitle: 'El mismo proceso en cada visita, sin importar el equipo.',
            accentColor: '#f97316',
            columns: [
              {
                eyebrow: 'Paso 1',
                title: 'Diagnóstico',
                content:
                  'Agendamos una visita y el técnico revisa el equipo en terreno, sin costo.',
              },
              {
                eyebrow: 'Paso 2',
                title: 'Cotización',
                content:
                  'Te explicamos la falla y el costo antes de intervenir el equipo.',
              },
              {
                eyebrow: 'Paso 3',
                title: 'Reparación',
                content:
                  'Reparamos en el momento cuando es posible, con repuestos originales.',
              },
              {
                eyebrow: 'Paso 4',
                title: 'Garantía',
                content:
                  'Dejamos 90 días de garantía escrita sobre la mano de obra y las piezas cambiadas.',
              },
            ],
          },
        },
        {
          type: 'Features',
          anchor: 'valores',
          props: {
            title: 'Nuestros valores',
            backgroundColor: '#fff7ed',
            accentColor: '#f97316',
            items: [
              {
                icon: 'badge-check',
                title: 'Honestidad primero',
                description: 'No reparamos ni cambiamos lo que no es necesario.',
              },
              {
                icon: 'clock',
                title: 'Puntualidad',
                description: 'Avisamos por WhatsApp cuando el técnico está en camino.',
              },
              {
                icon: 'shield',
                title: 'Garantía real',
                description: 'Toda reparación queda respaldada por escrito.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: 'Conversemos de tu equipo',
            subtitle: 'Cuéntanos qué te pasa y un técnico te contacta dentro del día.',
            buttonLabel: 'Ir al contacto',
            buttonHref: '/contacto',
            backgroundColor: '#1e3a8a',
            textColor: '#dbeafe',
          },
        },
      ],
    },
    {
      slug: 'contacto',
      title: 'Contacto',
      description: 'Agenda tu visita técnica o escríbenos por WhatsApp.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Agenda tu visita',
            title: 'Contáctanos',
            subtitle:
              'Respondemos dentro del día. Para reparaciones urgentes, escríbenos por WhatsApp.',
            variant: 'minimal',
          },
        },
        {
          type: 'ContactForm',
          props: {
            title: 'Cuéntanos qué necesitas reparar',
            subtitle: 'Completa el formulario y te confirmamos un horario de visita.',
            accentColor: '#1e3a8a',
            channels: [
              {
                type: 'phone',
                title: 'Llámanos',
                description: 'Atención de lunes a sábado.',
                value: '+56 9 5123 4567',
              },
              {
                type: 'whatsapp',
                title: 'WhatsApp',
                description: 'La vía más rápida para agendar una visita.',
                value: '56951234567',
                linkLabel: 'Iniciar chat',
              },
              {
                type: 'email',
                title: 'Email',
                description: 'Para cotizaciones de mantención o edificios.',
                value: 'contacto@servitechogar.cl',
              },
              {
                type: 'hours',
                title: 'Horario de atención',
                description: 'Visitas técnicas programadas dentro de este horario.',
                schedule: [
                  { day: 'Lunes a viernes', hours: '08:30 – 19:00' },
                  { day: 'Sábado', hours: '09:00 – 14:00' },
                  { day: 'Domingo', hours: 'Cerrado' },
                ],
              },
            ],
          },
        },
        {
          type: 'LocationMap',
          props: {
            title: 'Nuestro taller',
            address: 'Av. Irarrázaval 3100, Ñuñoa, Santiago, Chile',
            accentColor: '#1e3a8a',
          },
        },
      ],
    },
  ],
};

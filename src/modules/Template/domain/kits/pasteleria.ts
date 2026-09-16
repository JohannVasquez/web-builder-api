import type { SiteTemplate } from '../SiteTemplate';

// Kit para pastelerías y reposterías: tortas por encargo, cupcakes y catering dulce.
export const PASTELERIA_TEMPLATE: SiteTemplate = {
  id: 'pasteleria',
  label: 'Pastelería y repostería',
  industry: 'Pastelería y repostería',
  description:
    'Para pastelerías y reposterías que venden tortas por encargo, cupcakes y catering dulce.',
  brand: {
    palette: { primary: '#f43f5e', secondary: '#fde047', accent: '#38bdf8' },
    typography: { pairing: 'nunito', scale: 'normal' },
    colorMode: 'light',
    visualStyle: 'neo-brutalism',
  },
  settings: {
    siteName: 'Dulce Manía',
    tagline: 'Tortas y dulces que se notan a la vista',
    contactEmail: 'pedidos@dulcemania.cl',
    contactPhone: '+56 9 8123 4560',
    whatsappNumber: '56981234560',
    address: 'Av. Manuel Montt 450, Providencia, Santiago, Chile',
    instagramUrl: 'https://instagram.com/dulcemania.cl',
    tiktokUrl: 'https://tiktok.com/@dulcemania.cl',
  },
  navigation: [
    { label: 'Inicio', href: '/' },
    { label: 'Productos', href: '/productos' },
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Pedidos', href: '/contacto' },
  ],
  pages: [
    {
      slug: 'home',
      title: 'Inicio',
      description: 'Tortas por encargo, cupcakes y catering dulce en Providencia.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Pastelería artesanal',
            title: 'Tortas que se notan',
            titleAccent: 'a la vista y al primer bocado',
            subtitle:
              'Tortas personalizadas, cupcakes y mesas dulces hechas a mano, con ingredientes reales y mucho color.',
            ctaLabel: 'Encarga tu torta',
            ctaHref: '/contacto',
            secondaryCtaLabel: 'Ver productos',
            secondaryCtaHref: '/productos',
            accentColor: '#f43f5e',
            variant: 'centered',
          },
        },
        {
          type: 'Features',
          anchor: 'por-que-elegirnos',
          props: {
            title: 'Por qué nuestras clientas vuelven',
            variant: 'card',
            accentColor: '#f43f5e',
            items: [
              {
                icon: 'sun',
                title: 'Ingredientes reales',
                description:
                  'Nada de mezclas industriales: mantequilla, huevos y fruta fresca en cada preparación.',
              },
              {
                icon: 'badge-check',
                title: 'Diseño 100% personalizado',
                description:
                  'Cada torta se diseña según el tema, los colores y el número de invitados de tu evento.',
              },
              {
                icon: 'clock',
                title: 'Retiro o despacho a tiempo',
                description:
                  'Coordinamos la entrega para que llegue perfecta a tu celebración.',
              },
            ],
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'catalogo',
          props: {
            title: 'Lo más pedido',
            accentColor: '#38bdf8',
            items: [
              {
                icon: 'sun',
                title: 'Tortas personalizadas',
                description:
                  'Cumpleaños, bautizos y celebraciones a medida, en el tamaño que necesites.',
                checklist: ['Diseño a pedido', 'Desde 12 porciones'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Tortas de matrimonio',
                description: 'Diseños en varios pisos, con degustación previa incluida.',
                checklist: ['Degustación incluida', 'Reserva con anticipación'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'gauge',
                title: 'Mesas dulces y catering',
                description:
                  'Cupcakes, alfajores y mini postres para eventos y empresas.',
                checklist: ['Mínimo 20 personas', 'Despacho incluido'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
            ],
            viewAllLabel: 'Ver todo el catálogo',
            viewAllHref: '/productos',
          },
        },
        {
          type: 'Testimonials',
          props: {
            title: 'Lo que dicen nuestras clientas',
            accentColor: '#f43f5e',
            items: [
              {
                badgeLabel: 'Torta de cumpleaños · Providencia',
                quote:
                  'La torta llegó exactamente como el diseño que mandé por WhatsApp, y el sabor estuvo a la altura. Todos preguntaron dónde la pedimos.',
                rating: 5,
                authorName: 'Fernanda Rojas',
                authorLocation: 'Providencia, Santiago',
              },
              {
                badgeLabel: 'Torta de matrimonio · Las Condes',
                quote:
                  'La degustación nos ayudó a elegir el sabor perfecto y el día del evento todo salió impecable.',
                rating: 5,
                authorName: 'Matías Bravo',
                authorLocation: 'Las Condes, Santiago',
              },
              {
                badgeLabel: 'Mesa dulce · evento corporativo',
                quote:
                  'Pedimos una mesa dulce para 80 personas y llegó puntual, bien presentada y con opciones para todos los gustos.',
                rating: 5,
                authorName: 'Carolina Díaz',
                authorLocation: 'Santiago Centro',
              },
            ],
          },
        },
        {
          type: 'Stats',
          props: {
            backgroundColor: '#111827',
            textColor: '#fef9c3',
            accentColor: '#38bdf8',
            items: [
              { value: '+6', label: 'Años horneando' },
              { value: '+1.500', label: 'Tortas entregadas' },
              { value: '4.9/5', label: 'Calificación de nuestras clientas' },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿Tienes una fecha en mente?',
            subtitle:
              'Cuéntanos el tema, los colores y el número de invitados, y te mandamos una propuesta.',
            buttonLabel: 'Encargar mi torta',
            buttonHref: '/contacto',
            backgroundColor: '#f43f5e',
            textColor: '#fff1f2',
          },
        },
      ],
    },
    {
      slug: 'productos',
      title: 'Productos',
      description: 'Tortas personalizadas, cupcakes, mesas dulces y catering.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Nuestro catálogo',
            title: 'Dulce para cada ocasión',
            subtitle:
              'Todos nuestros productos se hacen frescos, bajo pedido, con al menos 48 horas de anticipación.',
            variant: 'minimal',
            accentColor: '#f43f5e',
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'catalogo-completo',
          props: {
            title: 'Nuestros productos',
            accentColor: '#f43f5e',
            items: [
              {
                icon: 'sun',
                title: 'Tortas personalizadas',
                description: 'Cumpleaños, bautizos y celebraciones a medida.',
                checklist: ['Desde 12 porciones', 'Diseño a pedido'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Tortas de matrimonio',
                description: 'Diseños en varios pisos, con degustación previa incluida.',
                checklist: ['Degustación incluida'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'gauge',
                title: 'Cupcakes por docena',
                description:
                  'Sabores clásicos o personalizados, decorados según tu evento.',
                checklist: ['Mínimo 1 docena', 'Varios sabores por pedido'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'shield',
                title: 'Mesas dulces',
                description: 'Selección de mini postres para eventos y celebraciones.',
                checklist: ['Mínimo 20 personas'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'clock',
                title: 'Catering de empresas',
                description:
                  'Cajas individuales y mesas dulces para eventos corporativos.',
                checklist: ['Despacho a oficinas', 'Facturación disponible'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Opciones sin gluten',
                description:
                  'Versiones sin gluten de nuestras tortas más pedidas, bajo pedido especial.',
                checklist: ['Preparación separada'],
                linkLabel: 'Cotizar',
                linkHref: '/contacto',
              },
            ],
          },
        },
        {
          type: 'Columns',
          anchor: 'como-pedir',
          props: {
            title: 'Cómo hacer tu pedido',
            subtitle: 'Así de simple es encargar tu torta.',
            accentColor: '#38bdf8',
            columns: [
              {
                eyebrow: 'Paso 1',
                title: 'Cuéntanos la idea',
                content:
                  'Escríbenos por WhatsApp con el tema, colores y fecha de tu evento.',
              },
              {
                eyebrow: 'Paso 2',
                title: 'Te enviamos una propuesta',
                content: 'Diseño referencial y precio según tamaño y complejidad.',
              },
              {
                eyebrow: 'Paso 3',
                title: 'Confirmas con anticipo',
                content: 'Reservamos tu fecha con un 50% de anticipo.',
              },
              {
                eyebrow: 'Paso 4',
                title: 'Retiro o despacho',
                content:
                  'Retiras en tienda o coordinamos despacho el mismo día del evento.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿Vas a celebrar algo pronto?',
            subtitle:
              'Escríbenos con al menos 48 horas de anticipación para asegurar tu fecha.',
            buttonLabel: 'Escribir por WhatsApp',
            buttonHref: '/contacto',
            backgroundColor: '#38bdf8',
            textColor: '#082f49',
          },
        },
      ],
    },
    {
      slug: 'nosotros',
      title: 'Nosotros',
      description:
        'La historia de Dulce Manía, desde la cocina de una casa hasta la tienda de hoy.',
      sections: [
        {
          type: 'Hero',
          props: {
            title: 'Somos Dulce Manía',
            subtitle:
              'Empezamos horneando en una cocina de casa y hoy tenemos tienda propia en Providencia.',
            variant: 'minimal',
          },
        },
        {
          type: 'TextBlock',
          props: {
            title: 'Nuestra historia',
            content:
              'Dulce Manía nació el 2018 en la cocina de una casa en Ñuñoa, horneando tortas para cumpleaños de amigos y familia. La voz se corrió rápido y en 2021 abrimos nuestro primer local en Providencia. Hoy somos un equipo de ocho personas que hornea, decora y despacha cientos de tortas cada mes, sin perder el detalle artesanal del principio.',
            backgroundColor: '#fff1f2',
          },
        },
        {
          type: 'SplitHighlights',
          anchor: 'equipo',
          props: {
            eyebrow: 'Nuestro equipo',
            title: 'Reposteras que aman lo que hacen',
            accentColor: '#f43f5e',
            items: [
              {
                icon: 'badge-check',
                title: 'Formación en pastelería profesional',
                description:
                  'Nuestro equipo de decoración se especializa en fondant, buttercream y diseño 3D.',
              },
              {
                icon: 'sun',
                title: 'Ingredientes seleccionados',
                description:
                  'Trabajamos con proveedores locales de mantequilla, huevo y fruta fresca.',
              },
              {
                icon: 'clock',
                title: 'Producción diaria',
                description:
                  'Horneamos todos los días para que cada torta salga fresca de nuestro horno.',
              },
            ],
          },
        },
        {
          type: 'Features',
          anchor: 'valores',
          props: {
            title: 'Lo que nos mueve',
            backgroundColor: '#eff6ff',
            accentColor: '#38bdf8',
            items: [
              {
                icon: 'sun',
                title: 'Sabor real',
                description: 'Nada de mezclas industriales, todo se hornea desde cero.',
              },
              {
                icon: 'badge-check',
                title: 'Detalle en cada diseño',
                description:
                  'Cada torta es única, diseñada especialmente para quien la pide.',
              },
              {
                icon: 'clock',
                title: 'Compromiso con la fecha',
                description:
                  'Tu celebración no espera, y nosotras tampoco atrasamos una entrega.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: 'Ven a conocer la tienda',
            subtitle:
              'Visítanos en Providencia o escríbenos para encargar tu próxima torta.',
            buttonLabel: 'Ir al contacto',
            buttonHref: '/contacto',
            backgroundColor: '#f43f5e',
            textColor: '#fff1f2',
          },
        },
      ],
    },
    {
      slug: 'contacto',
      title: 'Pedidos',
      description: 'Encarga tu torta por WhatsApp, email o teléfono.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Haz tu pedido',
            title: 'Encarga tu torta',
            subtitle:
              'Escríbenos con al menos 48 horas de anticipación para asegurar tu fecha.',
            variant: 'minimal',
          },
        },
        {
          type: 'ContactForm',
          props: {
            title: 'Cuéntanos tu pedido',
            subtitle: 'Tema, colores, número de porciones y fecha del evento.',
            accentColor: '#f43f5e',
            channels: [
              {
                type: 'phone',
                title: 'Llámanos',
                description: 'Atención en horario de tienda.',
                value: '+56 9 8123 4560',
              },
              {
                type: 'whatsapp',
                title: 'WhatsApp',
                description: 'La vía más rápida para encargar tu torta.',
                value: '56981234560',
                linkLabel: 'Encargar por WhatsApp',
              },
              {
                type: 'email',
                title: 'Email',
                description: 'Para pedidos de eventos grandes o catering corporativo.',
                value: 'pedidos@dulcemania.cl',
              },
              {
                type: 'hours',
                title: 'Horario de tienda',
                description: 'Retiro de pedidos y atención en local.',
                schedule: [
                  { day: 'Martes a viernes', hours: '10:00 – 19:00' },
                  { day: 'Sábado', hours: '10:00 – 15:00' },
                  { day: 'Lunes y domingo', hours: 'Cerrado' },
                ],
              },
            ],
          },
        },
        {
          type: 'LocationMap',
          props: {
            title: 'Nuestra tienda',
            address: 'Av. Manuel Montt 450, Providencia, Santiago, Chile',
            accentColor: '#f43f5e',
          },
        },
      ],
    },
  ],
};

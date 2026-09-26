import type { SiteTemplate } from '../SiteTemplate';

// Kit para restaurantes y cafeterías: carta, reservas y ambiente cálido.
export const RESTAURANTE_TEMPLATE: SiteTemplate = {
  id: 'restaurante',
  label: 'Restaurante o cafetería',
  industry: 'Restaurante o cafetería',
  description:
    'Para restaurantes y cafeterías que quieren mostrar su carta y recibir reservas online.',
  brand: {
    palette: { primary: '#7c2d12', secondary: '#166534', accent: '#eab308' },
    typography: { pairing: 'playfair-inter', scale: 'normal' },
    colorMode: 'light',
    visualStyle: 'classic',
  },
  settings: {
    siteName: 'Fogón Sur',
    tagline: 'Cocina de estación, a la leña',
    contactEmail: 'reservas@fogonsur.cl',
    contactPhone: '+56 9 4321 8765',
    whatsappNumber: '56943218765',
    address: 'Av. Nueva Costanera 3800, Vitacura, Santiago, Chile',
    instagramUrl: 'https://instagram.com/fogonsur',
    facebookUrl: 'https://facebook.com/fogonsur',
  },
  navigation: [
    { label: 'Inicio', href: '/' },
    { label: 'Carta', href: '/carta' },
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Reservas', href: '/contacto' },
  ],
  pages: [
    {
      slug: 'home',
      title: 'Inicio',
      description: 'Cocina de estación a la leña, en un ambiente cálido en Vitacura.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Cocina a la leña',
            title: 'Cocina de estación,',
            titleAccent: 'sabor de siempre',
            subtitle:
              'Ingredientes de productores locales, horno a leña y una carta que cambia con las estaciones. Te esperamos en Vitacura.',
            ctaLabel: 'Reserva tu mesa',
            ctaHref: '/contacto',
            secondaryCtaLabel: 'Ver la carta',
            secondaryCtaHref: '/carta',
            accentColor: '#eab308',
            variant: 'centered',
          },
        },
        {
          type: 'Features',
          anchor: 'por-que-venir',
          props: {
            title: 'Por qué venir a Fogón Sur',
            accentColor: '#7c2d12',
            variant: 'card',
            items: [
              {
                icon: 'sun',
                title: 'Producto de estación',
                description:
                  'Compramos cada semana a productores locales, la carta cambia según lo que esté en su punto.',
              },
              {
                icon: 'home',
                title: 'Ambiente cálido',
                description:
                  'Salón íntimo y terraza techada, ideal para almuerzos largos y cenas en grupo.',
              },
              {
                icon: 'badge-check',
                title: 'Horno a leña propio',
                description:
                  'Carnes, verduras y panes pasan por nuestro horno a leña, hecho a medida.',
              },
            ],
          },
        },
        {
          type: 'Columns',
          anchor: 'destacados',
          props: {
            title: 'Platos destacados',
            subtitle: 'Una muestra de lo que vas a encontrar en la carta.',
            accentColor: '#166534',
            columns: [
              {
                eyebrow: 'Entrada',
                title: 'Pulpo a la parrilla',
                content: 'Con puré rústico de papas nativas y aceite de oliva ahumado.',
              },
              {
                eyebrow: 'Fondo',
                title: 'Costillar a la leña',
                content:
                  'Doce horas de cocción lenta, con puré de zapallo y jugo reducido.',
              },
              {
                eyebrow: 'Fondo',
                title: 'Risotto de hongos',
                content: 'Hongos de estación, parmesano añejo y aceite de trufa.',
              },
              {
                eyebrow: 'Postre',
                title: 'Tarta de manzana tibia',
                content: 'Con helado de vainilla artesanal y caramelo salado.',
              },
            ],
          },
        },
        {
          type: 'Testimonials',
          props: {
            title: 'Lo que dicen nuestros comensales',
            accentColor: '#7c2d12',
            items: [
              {
                badgeLabel: 'Cena de aniversario',
                quote:
                  'El costillar a la leña es espectacular y el servicio fue atento sin ser invasivo. Volvimos a la semana siguiente.',
                rating: 5,
                authorName: 'Josefina Larraín',
                authorLocation: 'Vitacura, Santiago',
              },
              {
                badgeLabel: 'Almuerzo de trabajo',
                quote:
                  'Carta corta pero muy bien pensada, todo fresco. La terraza es perfecta para el verano.',
                rating: 5,
                authorName: 'Ignacio Fuenzalida',
                authorLocation: 'Las Condes, Santiago',
              },
              {
                badgeLabel: 'Cumpleaños en grupo',
                quote:
                  'Fuimos doce personas y el equipo se las arregló increíble. El risotto de hongos, de lo mejor que he probado.',
                rating: 5,
                authorName: 'Constanza Vidal',
                authorLocation: 'Providencia, Santiago',
              },
            ],
          },
        },
        {
          type: 'Stats',
          props: {
            backgroundColor: '#1c1917',
            textColor: '#fef3c7',
            accentColor: '#eab308',
            items: [
              { value: '+8', label: 'Años en Vitacura' },
              { value: '+40', label: 'Platos de temporada al año' },
              { value: '4.8/5', label: 'Calificación promedio' },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿Listo para reservar tu mesa?',
            subtitle:
              'Cuéntanos la fecha, el número de personas y te confirmamos al instante.',
            buttonLabel: 'Reservar ahora',
            buttonHref: '/contacto',
            backgroundColor: '#7c2d12',
            textColor: '#fef3c7',
          },
        },
      ],
    },
    {
      slug: 'carta',
      title: 'Carta',
      description: 'Entradas, fondos, postres y bebestibles con productos de estación.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Nuestra carta',
            title: 'Lo que cocinamos esta temporada',
            subtitle:
              'La carta cambia cada estación según el producto disponible. Esta es una muestra.',
            variant: 'minimal',
            accentColor: '#eab308',
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'menu',
          props: {
            title: 'Entradas y fondos',
            accentColor: '#7c2d12',
            items: [
              {
                icon: 'sun',
                title: 'Pulpo a la parrilla',
                description: 'Puré rústico de papas nativas y aceite de oliva ahumado.',
                checklist: ['Sin gluten', 'Producto de temporada'],
                linkLabel: 'Reservar mesa',
                linkHref: '/contacto',
              },
              {
                icon: 'home',
                title: 'Costillar a la leña',
                description:
                  'Doce horas de cocción lenta, con puré de zapallo y jugo reducido.',
                checklist: ['Cocción lenta a la leña'],
                linkLabel: 'Reservar mesa',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Risotto de hongos',
                description: 'Hongos de estación, parmesano añejo y aceite de trufa.',
                checklist: ['Opción vegetariana'],
                linkLabel: 'Reservar mesa',
                linkHref: '/contacto',
              },
              {
                icon: 'globe',
                title: 'Pesca del día',
                description:
                  'Según la llegada de la caleta, siempre a la parrilla con hierbas de nuestro huerto.',
                checklist: ['Sin gluten', 'Cambia semanalmente'],
                linkLabel: 'Reservar mesa',
                linkHref: '/contacto',
              },
            ],
          },
        },
        {
          type: 'Features',
          anchor: 'dietas',
          props: {
            eyebrow: 'Opciones especiales',
            title: 'Cocinamos para todos en la mesa',
            variant: 'plain',
            accentColor: '#166534',
            items: [
              {
                icon: 'badge-check',
                title: 'Vegetariano',
                description:
                  'Varias opciones en entradas y fondos, marcadas en la carta.',
              },
              {
                icon: 'shield',
                title: 'Sin gluten',
                description:
                  'Platos preparados con protocolos separados para evitar contaminación cruzada.',
              },
              {
                icon: 'sun',
                title: 'Menú de estación',
                description:
                  'Renovamos parte de la carta cada tres meses según la disponibilidad de producto.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿Tienes alguna restricción alimentaria?',
            subtitle: 'Avísanos al reservar y preparamos una opción especial para ti.',
            buttonLabel: 'Reservar y avisar',
            buttonHref: '/contacto',
            backgroundColor: '#166534',
            textColor: '#dcfce7',
          },
        },
      ],
    },
    {
      slug: 'nosotros',
      title: 'Nosotros',
      description: 'La historia de Fogón Sur y el equipo detrás de la cocina.',
      sections: [
        {
          type: 'Hero',
          props: {
            title: 'Somos Fogón Sur',
            subtitle:
              'Una cocina familiar que creció alrededor de un horno a leña, en el corazón de Vitacura.',
            variant: 'minimal',
          },
        },
        {
          type: 'TextBlock',
          props: {
            title: 'Nuestra historia',
            content:
              'Fogón Sur nació el 2017 como un proyecto familiar: un horno a leña armado a mano y una carta corta de diez platos. Hoy seguimos con la misma idea, cocinar con producto de estación y dejar que el fuego haga el trabajo, pero con un equipo de doce personas y una carta que evoluciona cuatro veces al año.',
            backgroundColor: '#fef3c7',
          },
        },
        {
          type: 'SplitHighlights',
          anchor: 'equipo',
          props: {
            eyebrow: 'Nuestro equipo',
            title: 'Cocina de autor, sin pretensiones',
            accentColor: '#7c2d12',
            items: [
              {
                icon: 'badge-check',
                title: 'Chef con formación en cocina de fuego',
                description:
                  'Nuestro equipo de cocina se especializa en técnicas de cocción lenta y a la brasa.',
              },
              {
                icon: 'sun',
                title: 'Huerto propio',
                description:
                  'Hierbas, flores comestibles y parte de las verduras vienen de nuestro huerto en Melipilla.',
              },
              {
                icon: 'home',
                title: 'Producto de cercanía',
                description:
                  'Trabajamos con productores y pescadores locales, priorizando distancias cortas.',
              },
            ],
          },
        },
        {
          type: 'Features',
          anchor: 'valores',
          props: {
            title: 'Lo que nos guía',
            backgroundColor: '#f0fdf4',
            accentColor: '#166534',
            items: [
              {
                icon: 'sun',
                title: 'Estacionalidad',
                description: 'Cocinamos con lo que da la tierra en cada momento del año.',
              },
              {
                icon: 'home',
                title: 'Cercanía',
                description: 'Trato familiar, con el mismo equipo desde el primer día.',
              },
              {
                icon: 'badge-check',
                title: 'Consistencia',
                description:
                  'Cada plato sale de la cocina con el mismo cuidado, todos los días.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: 'Ven a conocernos',
            subtitle: 'Reserva tu mesa y prueba lo que estamos cocinando esta temporada.',
            buttonLabel: 'Reservar mesa',
            buttonHref: '/contacto',
            backgroundColor: '#7c2d12',
            textColor: '#fef3c7',
          },
        },
      ],
    },
    {
      slug: 'contacto',
      title: 'Reservas',
      description: 'Reserva tu mesa por teléfono, WhatsApp o email.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Reservas',
            title: 'Reserva tu mesa',
            subtitle:
              'Te confirmamos por WhatsApp dentro de una hora, en horario de atención.',
            variant: 'minimal',
          },
        },
        {
          type: 'ContactForm',
          props: {
            title: 'Cuéntanos los detalles',
            subtitle:
              'Fecha, hora y número de personas. Para grupos de más de diez, escríbenos directo.',
            accentColor: '#7c2d12',
            channels: [
              {
                type: 'phone',
                title: 'Llámanos',
                description: 'Reservas por teléfono en horario de atención.',
                value: '+56 9 4321 8765',
              },
              {
                type: 'whatsapp',
                title: 'WhatsApp',
                description: 'La forma más rápida de reservar.',
                value: '56943218765',
                linkLabel: 'Reservar por WhatsApp',
              },
              {
                type: 'email',
                title: 'Email',
                description: 'Para reservas de grupos grandes o eventos privados.',
                value: 'reservas@fogonsur.cl',
              },
              {
                type: 'hours',
                title: 'Horario de atención',
                description: 'Almuerzo y cena, de martes a domingo.',
                schedule: [
                  { day: 'Martes a viernes', hours: '13:00 – 16:00 y 19:30 – 23:00' },
                  { day: 'Sábado y domingo', hours: '13:00 – 23:00' },
                  { day: 'Lunes', hours: 'Cerrado' },
                ],
              },
            ],
          },
        },
        {
          type: 'LocationMap',
          props: {
            title: 'Cómo llegar',
            address: 'Av. Nueva Costanera 3800, Vitacura, Santiago, Chile',
            accentColor: '#7c2d12',
          },
        },
      ],
    },
  ],
};

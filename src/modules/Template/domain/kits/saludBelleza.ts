import type { SiteTemplate } from '../SiteTemplate';

// Kit para spas, centros de estética y peluquerías: tratamientos y reservas.
export const SALUD_BELLEZA_TEMPLATE: SiteTemplate = {
  id: 'salud-belleza',
  label: 'Salud y belleza',
  industry: 'Salud y belleza',
  description:
    'Para spas, centros de estética y peluquerías que reciben reservas por tratamiento.',
  brand: {
    palette: { primary: '#be185d', secondary: '#0f766e', accent: '#f59e0b' },
    typography: { pairing: 'poppins-inter', scale: 'normal' },
    colorMode: 'light',
    visualStyle: 'minimal',
  },
  settings: {
    siteName: 'Bella Piel Spa',
    tagline: 'Bienestar y cuidado de la piel en Providencia',
    contactEmail: 'hola@bellapielspa.cl',
    contactPhone: '+56 9 6789 0123',
    whatsappNumber: '56967890123',
    address: 'Av. Pedro de Valdivia 1560, Providencia, Santiago, Chile',
    instagramUrl: 'https://instagram.com/bellapielspa',
    facebookUrl: 'https://facebook.com/bellapielspa',
  },
  navigation: [
    { label: 'Inicio', href: '/' },
    { label: 'Tratamientos', href: '/tratamientos' },
    { label: 'Equipo', href: '/equipo' },
    { label: 'Reservas', href: '/contacto' },
  ],
  pages: [
    {
      slug: 'home',
      title: 'Inicio',
      description: 'Tratamientos faciales, corporales y de bienestar en Providencia.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Spa y centro de estética',
            title: 'Un momento para ti,',
            titleAccent: 'en el corazón de Providencia',
            subtitle:
              'Tratamientos faciales, corporales y de bienestar con protocolos personalizados para cada tipo de piel.',
            ctaLabel: 'Reserva tu hora',
            ctaHref: '/contacto',
            secondaryCtaLabel: 'Ver tratamientos',
            secondaryCtaHref: '/tratamientos',
            accentColor: '#be185d',
            variant: 'minimal',
          },
        },
        {
          type: 'Features',
          anchor: 'beneficios',
          props: {
            title: 'Por qué elegirnos',
            variant: 'card',
            accentColor: '#be185d',
            items: [
              {
                icon: 'badge-check',
                title: 'Protocolos personalizados',
                description:
                  'Cada tratamiento se adapta a tu tipo de piel y objetivos, evaluados en tu primera sesión.',
              },
              {
                icon: 'shield',
                title: 'Productos profesionales',
                description:
                  'Trabajamos con líneas dermocosméticas certificadas, sin ingredientes agresivos.',
              },
              {
                icon: 'clock',
                title: 'Ambiente relajado',
                description:
                  'Salas privadas y agenda pensada para que no tengas que esperar.',
              },
            ],
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'destacados',
          props: {
            title: 'Tratamientos más solicitados',
            accentColor: '#0f766e',
            items: [
              {
                icon: 'sun',
                title: 'Limpieza facial profunda',
                description:
                  'Extracción, hidratación y mascarilla según tu tipo de piel.',
                checklist: ['60 minutos', 'Apta para todo tipo de piel'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
              {
                icon: 'zap',
                title: 'Radiofrecuencia facial',
                description:
                  'Estimula colágeno y mejora la firmeza de la piel del rostro.',
                checklist: ['45 minutos', 'Recomendado en sesiones'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Masaje descontracturante',
                description:
                  'Libera tensión de cuello, espalda y hombros con técnica profunda.',
                checklist: ['50 minutos', 'Ideal después de una semana larga'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
            ],
            viewAllLabel: 'Ver todos los tratamientos',
            viewAllHref: '/tratamientos',
          },
        },
        {
          type: 'Testimonials',
          props: {
            title: 'Lo que dicen nuestras pacientas',
            accentColor: '#be185d',
            items: [
              {
                badgeLabel: 'Limpieza facial',
                quote:
                  'Llevo un año viniendo cada mes y mi piel ha cambiado por completo. La atención es súper cercana.',
                rating: 5,
                authorName: 'Antonia Reyes',
                authorLocation: 'Providencia, Santiago',
              },
              {
                badgeLabel: 'Masajes',
                quote:
                  'El masaje descontracturante me salvó después de meses de dolor de espalda. Ahora vengo cada quince días.',
                rating: 5,
                authorName: 'Valentina Prieto',
                authorLocation: 'Ñuñoa, Santiago',
              },
              {
                badgeLabel: 'Radiofrecuencia',
                quote:
                  'Expliqué mi piel sensible y armaron un protocolo especial para mí. Resultados visibles desde la tercera sesión.',
                rating: 5,
                authorName: 'Camila Herrera',
                authorLocation: 'Las Condes, Santiago',
              },
            ],
          },
        },
        {
          type: 'Stats',
          props: {
            backgroundColor: '#4c0519',
            textColor: '#fce7f3',
            accentColor: '#f59e0b',
            items: [
              { value: '+9', label: 'Años de experiencia' },
              { value: '+3.000', label: 'Sesiones realizadas' },
              { value: '4.9/5', label: 'Calificación de nuestras pacientas' },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: 'Regálate un momento para ti',
            subtitle:
              'Agenda tu primera evaluación y arma un plan de tratamiento a tu medida.',
            buttonLabel: 'Reservar hora',
            buttonHref: '/contacto',
            backgroundColor: '#be185d',
            textColor: '#fce7f3',
          },
        },
      ],
    },
    {
      slug: 'tratamientos',
      title: 'Tratamientos',
      description:
        'Faciales, corporales, manicure y masajes con protocolos personalizados.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Nuestros tratamientos',
            title: 'Cuidado para cada necesidad',
            subtitle:
              'Todos nuestros tratamientos comienzan con una evaluación de piel gratuita.',
            variant: 'minimal',
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'catalogo',
          props: {
            title: 'Faciales y corporales',
            accentColor: '#be185d',
            items: [
              {
                icon: 'sun',
                title: 'Limpieza facial profunda',
                description:
                  'Extracción, hidratación y mascarilla según tu tipo de piel.',
                checklist: ['60 minutos'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
              {
                icon: 'zap',
                title: 'Radiofrecuencia facial',
                description:
                  'Estimula colágeno y mejora la firmeza de la piel del rostro.',
                checklist: ['45 minutos', 'En sesiones de 6'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Peeling químico suave',
                description: 'Renueva la textura de la piel y ayuda a manchas leves.',
                checklist: ['30 minutos', 'Recomendado por temporada'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Masaje descontracturante',
                description:
                  'Libera tensión de cuello, espalda y hombros con técnica profunda.',
                checklist: ['50 minutos'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
              {
                icon: 'shield',
                title: 'Drenaje linfático',
                description:
                  'Técnica suave que ayuda a reducir la retención de líquidos.',
                checklist: ['50 minutos'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
              {
                icon: 'gauge',
                title: 'Manicure y pedicure spa',
                description:
                  'Ritual completo de manos y pies con exfoliación e hidratación.',
                checklist: ['75 minutos'],
                linkLabel: 'Reservar',
                linkHref: '/contacto',
              },
            ],
          },
        },
        {
          type: 'Columns',
          anchor: 'primera-sesion',
          props: {
            title: 'Tu primera sesión',
            subtitle: 'Así trabajamos antes de recomendarte un tratamiento.',
            accentColor: '#0f766e',
            columns: [
              {
                eyebrow: 'Paso 1',
                title: 'Evaluación de piel',
                content: 'Conversamos sobre tu piel, hábitos y objetivos, sin costo.',
              },
              {
                eyebrow: 'Paso 2',
                title: 'Plan personalizado',
                content: 'Te proponemos un tratamiento o plan de sesiones según tu caso.',
              },
              {
                eyebrow: 'Paso 3',
                title: 'Seguimiento',
                content:
                  'Revisamos tu evolución en cada visita y ajustamos el protocolo.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿No sabes qué tratamiento elegir?',
            subtitle:
              'Agenda una evaluación de piel gratuita y te recomendamos el mejor plan.',
            buttonLabel: 'Agendar evaluación',
            buttonHref: '/contacto',
            backgroundColor: '#0f766e',
            textColor: '#ccfbf1',
          },
        },
      ],
    },
    {
      slug: 'equipo',
      title: 'Equipo',
      description: 'Conoce a las profesionales detrás de Bella Piel Spa.',
      sections: [
        {
          type: 'Hero',
          props: {
            title: 'Nuestro equipo',
            subtitle:
              'Cosmetólogas y terapeutas certificadas, con formación continua en nuevas técnicas.',
            variant: 'minimal',
          },
        },
        {
          type: 'TextBlock',
          props: {
            title: 'Nuestra historia',
            content:
              'Bella Piel Spa abrió sus puertas el 2016 con una sola sala de tratamiento y una cosmetóloga. Hoy somos un equipo de seis profesionales certificadas que atienden en tres salas privadas, siempre con el mismo enfoque: entender tu piel antes de proponer cualquier tratamiento.',
            backgroundColor: '#fdf2f8',
          },
        },
        {
          type: 'SplitHighlights',
          anchor: 'profesionales',
          props: {
            eyebrow: 'Nuestras profesionales',
            title: 'Formación certificada y actualización constante',
            accentColor: '#be185d',
            items: [
              {
                icon: 'badge-check',
                title: 'Cosmetólogas certificadas',
                description:
                  'Todo el equipo tiene formación profesional en cosmetología y dermocosmética.',
              },
              {
                icon: 'shield',
                title: 'Protocolos seguros',
                description:
                  'Trabajamos con productos aprobados y protocolos de higiene estrictos en cada sala.',
              },
              {
                icon: 'clock',
                title: 'Capacitación continua',
                description:
                  'Actualizamos técnicas y equipos cada año para ofrecer mejores resultados.',
              },
            ],
          },
        },
        {
          type: 'Features',
          anchor: 'valores',
          props: {
            title: 'Lo que nos define',
            backgroundColor: '#f0fdfa',
            accentColor: '#0f766e',
            items: [
              {
                icon: 'badge-check',
                title: 'Cercanía',
                description: 'Te escuchamos antes de recomendarte cualquier tratamiento.',
              },
              {
                icon: 'shield',
                title: 'Seguridad',
                description: 'Protocolos claros y productos certificados en cada sesión.',
              },
              {
                icon: 'sun',
                title: 'Resultados reales',
                description: 'Seguimiento de cada plan para que veas avances concretos.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: 'Conoce a tu terapeuta ideal',
            subtitle: 'Cuéntanos qué buscas y te asignamos la profesional adecuada.',
            buttonLabel: 'Reservar hora',
            buttonHref: '/contacto',
            backgroundColor: '#be185d',
            textColor: '#fce7f3',
          },
        },
      ],
    },
    {
      slug: 'contacto',
      title: 'Reservas',
      description: 'Reserva tu hora por teléfono, WhatsApp o email.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Reservas',
            title: 'Reserva tu hora',
            subtitle: 'Te confirmamos por WhatsApp dentro del día.',
            variant: 'minimal',
          },
        },
        {
          type: 'ContactForm',
          props: {
            title: 'Cuéntanos qué necesitas',
            subtitle: 'Completa el formulario y te contactamos para confirmar tu hora.',
            accentColor: '#be185d',
            channels: [
              {
                type: 'phone',
                title: 'Llámanos',
                description: 'Reservas y consultas en horario de atención.',
                value: '+56 9 6789 0123',
              },
              {
                type: 'whatsapp',
                title: 'WhatsApp',
                description: 'La vía más rápida para reservar tu hora.',
                value: '56967890123',
                linkLabel: 'Reservar por WhatsApp',
              },
              {
                type: 'email',
                title: 'Email',
                description: 'Para consultas sobre tratamientos o packs.',
                value: 'hola@bellapielspa.cl',
              },
              {
                type: 'hours',
                title: 'Horario de atención',
                description: 'Atención con hora agendada.',
                schedule: [
                  { day: 'Lunes a viernes', hours: '09:30 – 20:00' },
                  { day: 'Sábado', hours: '10:00 – 15:00' },
                  { day: 'Domingo', hours: 'Cerrado' },
                ],
              },
            ],
          },
        },
        {
          type: 'LocationMap',
          props: {
            title: 'Cómo llegar',
            address: 'Av. Pedro de Valdivia 1560, Providencia, Santiago, Chile',
            accentColor: '#be185d',
          },
        },
      ],
    },
  ],
};

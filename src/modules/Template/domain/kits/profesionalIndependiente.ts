import type { SiteTemplate } from '../SiteTemplate';

// Kit para profesionales independientes: consultas psicológicas, legales, contables o de diseño.
export const PROFESIONAL_INDEPENDIENTE_TEMPLATE: SiteTemplate = {
  id: 'profesional-independiente',
  label: 'Profesional independiente',
  industry: 'Profesional independiente',
  description:
    'Para psicólogos, abogados, contadores y consultores que atienden de forma independiente.',
  brand: {
    palette: { primary: '#4c1d95', secondary: '#065f46', accent: '#f59e0b' },
    typography: { pairing: 'lora-source-sans', scale: 'normal' },
    colorMode: 'light',
    visualStyle: 'minimal',
  },
  settings: {
    siteName: 'Constanza Ibáñez, Psicóloga',
    tagline: 'Terapia individual para adultos y adolescentes',
    contactEmail: 'contacto@constanzaibanez.cl',
    contactPhone: '+56 9 7890 1234',
    whatsappNumber: '56978901234',
    address: 'Av. Holanda 620, Providencia, Santiago, Chile',
    instagramUrl: 'https://instagram.com/constanzaibanez.psi',
    linkedinUrl: 'https://linkedin.com/in/constanza-ibanez-psi',
  },
  navigation: [
    { label: 'Inicio', href: '/' },
    { label: 'Áreas de atención', href: '/servicios' },
    { label: 'Sobre mí', href: '/sobre-mi' },
    { label: 'Contacto', href: '/contacto' },
  ],
  pages: [
    {
      slug: 'home',
      title: 'Inicio',
      description: 'Terapia individual presencial y online para adultos y adolescentes.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Psicóloga clínica',
            title: 'Un espacio para',
            titleAccent: 'conversar sin juicios',
            subtitle:
              'Terapia individual para adultos y adolescentes, presencial en Providencia u online. Primera sesión de evaluación sin compromiso.',
            ctaLabel: 'Agenda tu primera sesión',
            ctaHref: '/contacto',
            secondaryCtaLabel: 'Ver áreas de atención',
            secondaryCtaHref: '/servicios',
            accentColor: '#4c1d95',
            variant: 'minimal',
          },
        },
        {
          type: 'Features',
          anchor: 'modalidad',
          props: {
            title: 'Cómo trabajamos',
            variant: 'plain',
            accentColor: '#4c1d95',
            items: [
              {
                icon: 'home',
                title: 'Presencial u online',
                description:
                  'Sesiones en consulta en Providencia o por videollamada, según lo que te acomode.',
              },
              {
                icon: 'shield',
                title: 'Confidencialidad total',
                description:
                  'Todo lo que se conversa en sesión queda protegido por el secreto profesional.',
              },
              {
                icon: 'clock',
                title: 'Sesiones de 50 minutos',
                description:
                  'Frecuencia semanal o quincenal, según lo que definamos juntos.',
              },
            ],
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'areas',
          props: {
            title: 'Áreas de atención',
            accentColor: '#065f46',
            items: [
              {
                icon: 'shield',
                title: 'Ansiedad y estrés',
                description:
                  'Herramientas concretas para manejar la ansiedad en el día a día.',
                checklist: ['Sesiones semanales', 'Enfoque cognitivo-conductual'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
              {
                icon: 'home',
                title: 'Duelo y pérdidas',
                description: 'Acompañamiento en procesos de duelo, a tu propio ritmo.',
                checklist: ['Espacio sin apuro', 'Seguimiento personalizado'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Relaciones y vínculos',
                description: 'Trabajo sobre patrones de relación, límites y autoestima.',
                checklist: ['Enfoque en historia personal'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
            ],
            viewAllLabel: 'Ver todas las áreas',
            viewAllHref: '/servicios',
          },
        },
        {
          type: 'Testimonials',
          props: {
            title: 'Lo que dicen mis pacientes',
            accentColor: '#4c1d95',
            items: [
              {
                badgeLabel: 'Terapia individual',
                quote:
                  'Encontré un espacio donde de verdad me sentí escuchada, sin apuro y sin sentirme juzgada en ningún momento.',
                rating: 5,
                authorName: 'M. J.',
                authorLocation: 'Paciente desde 2023',
              },
              {
                badgeLabel: 'Sesiones online',
                quote:
                  'Empecé por las sesiones online desde regiones y el proceso fue igual de cercano que si estuviera presencial.',
                rating: 5,
                authorName: 'R. T.',
                authorLocation: 'Paciente desde 2022',
              },
              {
                badgeLabel: 'Terapia adolescentes',
                quote:
                  'Mi hija empezó terapia hace seis meses y el cambio ha sido enorme. Muy profesional y siempre disponible ante dudas.',
                rating: 5,
                authorName: 'P. A., madre de paciente',
                authorLocation: 'Providencia, Santiago',
              },
            ],
          },
        },
        {
          type: 'Stats',
          props: {
            backgroundColor: '#1e1b3a',
            textColor: '#ede9fe',
            accentColor: '#f59e0b',
            items: [
              { value: '+10', label: 'Años de ejercicio clínico' },
              { value: '+200', label: 'Pacientes atendidos' },
              { value: '100%', label: 'Confidencialidad garantizada' },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: 'Da el primer paso',
            subtitle:
              'Agenda una primera sesión de evaluación, sin compromiso de continuar.',
            buttonLabel: 'Agendar primera sesión',
            buttonHref: '/contacto',
            backgroundColor: '#4c1d95',
            textColor: '#ede9fe',
          },
        },
      ],
    },
    {
      slug: 'servicios',
      title: 'Áreas de atención',
      description: 'Ansiedad, duelo, relaciones y acompañamiento a adolescentes.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Áreas de atención',
            title: 'En qué te puedo acompañar',
            subtitle:
              'Trabajo con adultos y adolescentes desde un enfoque cognitivo-conductual, adaptado a cada persona.',
            variant: 'minimal',
          },
        },
        {
          type: 'ServiceCards',
          anchor: 'catalogo',
          props: {
            title: 'Áreas de trabajo',
            accentColor: '#4c1d95',
            items: [
              {
                icon: 'shield',
                title: 'Ansiedad y estrés',
                description:
                  'Herramientas concretas para manejar la ansiedad en el día a día, en el trabajo o los estudios.',
                checklist: ['Enfoque cognitivo-conductual'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
              {
                icon: 'home',
                title: 'Duelo y pérdidas',
                description:
                  'Acompañamiento en procesos de duelo por fallecimiento, separación u otros cambios de vida.',
                checklist: ['Espacio sin apuro'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
              {
                icon: 'badge-check',
                title: 'Relaciones y vínculos',
                description:
                  'Patrones de relación, límites, autoestima y comunicación en pareja o familia.',
                checklist: ['Trabajo sobre historia personal'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
              {
                icon: 'clock',
                title: 'Adolescentes',
                description:
                  'Espacio de confianza para adolescentes, coordinado con la familia cuando es necesario.',
                checklist: ['Sesiones adaptadas a la edad'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
              {
                icon: 'gauge',
                title: 'Manejo emocional',
                description:
                  'Herramientas para identificar y regular emociones intensas en el día a día.',
                checklist: ['Técnicas prácticas'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
              {
                icon: 'lightbulb',
                title: 'Toma de decisiones',
                description:
                  'Acompañamiento en momentos de cambio: laborales, académicos o personales.',
                checklist: ['Espacio de reflexión guiada'],
                linkLabel: 'Agendar sesión',
                linkHref: '/contacto',
              },
            ],
          },
        },
        {
          type: 'Features',
          anchor: 'modalidades',
          props: {
            eyebrow: 'Modalidades',
            title: 'Presencial u online',
            variant: 'plain',
            accentColor: '#065f46',
            items: [
              {
                icon: 'home',
                title: 'Presencial',
                description: 'Consulta en Providencia, con hora fija cada semana.',
              },
              {
                icon: 'globe',
                title: 'Online',
                description:
                  'Sesiones por videollamada, misma calidad de atención desde cualquier lugar.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: '¿No sabes por dónde empezar?',
            subtitle:
              'Agenda una primera sesión de evaluación y juntas definimos el enfoque.',
            buttonLabel: 'Agendar primera sesión',
            buttonHref: '/contacto',
            backgroundColor: '#065f46',
            textColor: '#d1fae5',
          },
        },
      ],
    },
    {
      slug: 'sobre-mi',
      title: 'Sobre mí',
      description: 'Formación, enfoque terapéutico y trayectoria clínica.',
      sections: [
        {
          type: 'Hero',
          props: {
            title: 'Sobre mí',
            subtitle:
              'Psicóloga clínica, magíster en terapia cognitivo-conductual, con más de diez años de ejercicio.',
            variant: 'minimal',
          },
        },
        {
          type: 'TextBlock',
          props: {
            title: 'Mi trayectoria',
            content:
              'Soy psicóloga de la Pontificia Universidad Católica de Chile y magíster en terapia cognitivo-conductual. Durante los primeros años trabajé en salud pública, atendiendo adultos y adolescentes en un centro comunitario, y desde 2016 atiendo en consulta privada. Me interesa especialmente el trabajo con ansiedad, duelo y procesos de cambio.',
            backgroundColor: '#f5f3ff',
          },
        },
        {
          type: 'SplitHighlights',
          anchor: 'formacion',
          props: {
            eyebrow: 'Formación y enfoque',
            title: 'Un enfoque basado en evidencia',
            accentColor: '#4c1d95',
            items: [
              {
                icon: 'badge-check',
                title: 'Magíster en TCC',
                description:
                  'Formación de postgrado en terapia cognitivo-conductual, con actualización continua.',
              },
              {
                icon: 'shield',
                title: 'Registro Superintendencia de Salud',
                description:
                  'Inscrita en el registro nacional de prestadores individuales de salud.',
              },
              {
                icon: 'clock',
                title: 'Supervisión clínica permanente',
                description:
                  'Superviso mis casos de forma periódica con otros profesionales del área.',
              },
            ],
          },
        },
        {
          type: 'Features',
          anchor: 'valores',
          props: {
            title: 'Cómo trabajo',
            backgroundColor: '#ecfdf5',
            accentColor: '#065f46',
            items: [
              {
                icon: 'shield',
                title: 'Sin juicios',
                description:
                  'Un espacio donde puedas hablar con libertad, a tu propio ritmo.',
              },
              {
                icon: 'badge-check',
                title: 'Basado en evidencia',
                description:
                  'Técnicas validadas científicamente, adaptadas a cada persona.',
              },
              {
                icon: 'clock',
                title: 'Proceso claro',
                description: 'Definimos objetivos juntas desde la primera sesión.',
              },
            ],
          },
        },
        {
          type: 'CallToAction',
          props: {
            title: 'Conversemos',
            subtitle: 'Escríbeme y agendamos una primera sesión de evaluación.',
            buttonLabel: 'Ir al contacto',
            buttonHref: '/contacto',
            backgroundColor: '#4c1d95',
            textColor: '#ede9fe',
          },
        },
      ],
    },
    {
      slug: 'contacto',
      title: 'Contacto',
      description: 'Agenda tu primera sesión por WhatsApp, email o teléfono.',
      sections: [
        {
          type: 'Hero',
          props: {
            eyebrow: 'Agenda tu hora',
            title: 'Conversemos',
            subtitle:
              'Respondo dentro del día hábil. Cuéntame brevemente qué te gustaría trabajar.',
            variant: 'minimal',
          },
        },
        {
          type: 'ContactForm',
          props: {
            title: 'Escríbeme',
            subtitle:
              'Completa el formulario y te contacto para coordinar tu primera sesión.',
            accentColor: '#4c1d95',
            channels: [
              {
                type: 'phone',
                title: 'Llámame',
                description: 'Consultas breves antes de agendar.',
                value: '+56 9 7890 1234',
              },
              {
                type: 'whatsapp',
                title: 'WhatsApp',
                description: 'La vía más rápida para coordinar tu primera sesión.',
                value: '56978901234',
                linkLabel: 'Escribir por WhatsApp',
              },
              {
                type: 'email',
                title: 'Email',
                description: 'Para consultas más detalladas o derivaciones.',
                value: 'contacto@constanzaibanez.cl',
              },
              {
                type: 'hours',
                title: 'Horario de atención',
                description: 'Sesiones con hora agendada, presencial u online.',
                schedule: [
                  { day: 'Lunes a jueves', hours: '09:00 – 19:00' },
                  { day: 'Viernes', hours: '09:00 – 14:00' },
                  { day: 'Fin de semana', hours: 'Cerrado' },
                ],
              },
            ],
          },
        },
        {
          type: 'LocationMap',
          props: {
            title: 'Ubicación de la consulta',
            subtitle: 'Sesiones presenciales, previa coordinación de hora.',
            address: 'Av. Holanda 620, Providencia, Santiago, Chile',
            accentColor: '#4c1d95',
          },
        },
      ],
    },
  ],
};

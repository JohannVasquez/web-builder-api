// Catálogo curado de combinaciones tipográficas (SPEC 1.2); fuente de verdad para API, MCP y frontend.
export interface FontPairing {
  readonly id: string;
  // Nombre corto para el selector del panel.
  readonly label: string;
  // Cuándo conviene: lo que lee quien elige, persona o agente.
  readonly description: string;
  readonly headingFamily: string;
  readonly bodyFamily: string;
}

export const FONT_PAIRINGS: readonly FontPairing[] = [
  {
    id: 'inter',
    label: 'Inter',
    description: 'Neutra y moderna. La opción segura cuando la marca no pide nada raro.',
    headingFamily: 'Inter',
    bodyFamily: 'Inter',
  },
  {
    id: 'playfair-inter',
    label: 'Playfair Display + Inter',
    description:
      'Títulos con serifa elegante sobre texto neutro. Editorial, joyería, hotelería.',
    headingFamily: 'Playfair Display',
    bodyFamily: 'Inter',
  },
  {
    id: 'montserrat-open-sans',
    label: 'Montserrat + Open Sans',
    description: 'Corporativo cercano. Servicios profesionales y empresas medianas.',
    headingFamily: 'Montserrat',
    bodyFamily: 'Open Sans',
  },
  {
    id: 'poppins-inter',
    label: 'Poppins + Inter',
    description: 'Geométrica y amable. Salud, belleza, cuidado personal.',
    headingFamily: 'Poppins',
    bodyFamily: 'Inter',
  },
  {
    id: 'dm-serif-dm-sans',
    label: 'DM Serif Display + DM Sans',
    description: 'Clásico contemporáneo con mucho carácter en los títulos.',
    headingFamily: 'DM Serif Display',
    bodyFamily: 'DM Sans',
  },
  {
    id: 'space-grotesk-inter',
    label: 'Space Grotesk + Inter',
    description: 'Técnica, de producto. Software, ingeniería, startups.',
    headingFamily: 'Space Grotesk',
    bodyFamily: 'Inter',
  },
  {
    id: 'bebas-roboto',
    label: 'Bebas Neue + Roboto',
    description: 'Títulos condensados de alto impacto. Gimnasios, eventos, automotriz.',
    headingFamily: 'Bebas Neue',
    bodyFamily: 'Roboto',
  },
  {
    id: 'lora-source-sans',
    label: 'Lora + Source Sans 3',
    description: 'Pensada para leer mucho texto. Blogs, estudios, consultoras.',
    headingFamily: 'Lora',
    bodyFamily: 'Source Sans 3',
  },
  {
    id: 'oswald-lato',
    label: 'Oswald + Lato',
    description: 'Industrial y directa. Construcción, servicios técnicos, transporte.',
    headingFamily: 'Oswald',
    bodyFamily: 'Lato',
  },
  {
    id: 'nunito',
    label: 'Nunito',
    description: 'Redondeada y cálida. Pastelería, infancia, mascotas.',
    headingFamily: 'Nunito',
    bodyFamily: 'Nunito',
  },
  {
    id: 'archivo-black-archivo',
    label: 'Archivo Black + Archivo',
    description: 'Muy gruesa y compacta. Pensada para el estilo Neo-Brutalism.',
    headingFamily: 'Archivo Black',
    bodyFamily: 'Archivo',
  },
];

export const DEFAULT_FONT_PAIRING_ID = 'inter';

export const FONT_PAIRING_IDS: readonly string[] = FONT_PAIRINGS.map(
  (pairing) => pairing.id,
);

export const findFontPairing = (id: string): FontPairing | undefined =>
  FONT_PAIRINGS.find((pairing) => pairing.id === id);

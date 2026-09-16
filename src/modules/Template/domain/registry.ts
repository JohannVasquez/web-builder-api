import type { SiteTemplate } from './SiteTemplate';
import { SERVICIOS_TECNICOS_TEMPLATE } from './kits/serviciosTecnicos';
import { RESTAURANTE_TEMPLATE } from './kits/restaurante';
import { SALUD_BELLEZA_TEMPLATE } from './kits/saludBelleza';
import { PROFESIONAL_INDEPENDIENTE_TEMPLATE } from './kits/profesionalIndependiente';
import { CONSTRUCCION_TEMPLATE } from './kits/construccion';
import { PASTELERIA_TEMPLATE } from './kits/pasteleria';

// Catálogo de kits de inicio (SPEC 5.1): crear un cliente nuevo es elegir uno de
// estos y cambiar textos, imágenes y colores.
export const SITE_TEMPLATES: readonly SiteTemplate[] = [
  SERVICIOS_TECNICOS_TEMPLATE,
  RESTAURANTE_TEMPLATE,
  SALUD_BELLEZA_TEMPLATE,
  PROFESIONAL_INDEPENDIENTE_TEMPLATE,
  CONSTRUCCION_TEMPLATE,
  PASTELERIA_TEMPLATE,
];

export const findSiteTemplate = (id: string): SiteTemplate | undefined =>
  SITE_TEMPLATES.find((template) => template.id === id);

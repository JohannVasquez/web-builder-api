export type LegalPageKind = 'privacidad' | 'terminos';

export interface LegalPageTemplate {
  readonly kind: LegalPageKind;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly body: string;
}

// Los datos del negocio se interpolan con marcadores en vez de pedirlos por parámetro:
// así agregar un dato a la plantilla no cambia la firma de nadie.
export const fillPlaceholders = (
  text: string,
  values: Readonly<Record<string, string>>,
): string =>
  text.replaceAll(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined || value === '' ? match : value;
  });

const PRIVACY = `## Quiénes somos

{{siteName}} es responsable del tratamiento de los datos personales que recibe
a través de este sitio. Puedes contactarnos en {{contactEmail}}.

## Qué datos recogemos

Solo los que nos entregas voluntariamente al escribirnos por el formulario de
contacto: tu nombre, tu correo electrónico, tu teléfono si lo indicas y el
mensaje que nos envías.

Además, si has aceptado el uso de cookies, recogemos datos de navegación
anónimos para entender cómo se usa el sitio y mejorarlo.

## Para qué los usamos

Para responderte, para hacerle seguimiento a tu consulta y para mejorar
nuestros servicios. No vendemos ni cedemos tus datos a terceros.

## Cuánto tiempo los guardamos

Mantenemos tus mensajes mientras sean necesarios para atenderte y para el
seguimiento comercial posterior. Puedes pedirnos que los borremos cuando
quieras.

## Tus derechos

Puedes pedirnos acceder a tus datos, corregirlos o eliminarlos escribiendo a
{{contactEmail}}. Te responderemos dentro de los plazos que exige la Ley 19.628
sobre protección de la vida privada.

## Cookies

Este sitio puede usar cookies propias y de terceros con fines de medición. Si
el aviso de cookies está activo, ninguna cookie de medición se instala hasta
que la aceptas.

## Cambios a esta política

Si cambiamos esta política, publicaremos la versión actualizada en esta misma
página.`;

const TERMS = `## Aceptación

Al usar este sitio aceptas estos términos. Si no estás de acuerdo con ellos,
te pedimos no utilizarlo.

## Quiénes somos

Este sitio pertenece a {{siteName}}, con domicilio en {{address}}. Para
cualquier consulta puedes escribirnos a {{contactEmail}} o llamarnos al
{{contactPhone}}.

## Uso del sitio

El contenido de este sitio es informativo. Nos esforzamos por mantenerlo al
día, pero no garantizamos que esté libre de errores ni que los precios,
plazos o disponibilidad publicados sigan vigentes al momento de tu consulta.

Cualquier cotización o compromiso se confirma por escrito antes de iniciar un
trabajo.

## Propiedad intelectual

Los textos, imágenes, logotipos y demás contenidos de este sitio pertenecen a
{{siteName}} o se usan con autorización. No pueden reproducirse sin permiso.

## Enlaces a otros sitios

Este sitio puede enlazar a páginas de terceros. No somos responsables de su
contenido ni de sus prácticas de privacidad.

## Responsabilidad

No respondemos por daños derivados del uso de la información publicada aquí,
salvo en aquello que la ley no permite limitar.

## Legislación aplicable

Estos términos se rigen por la ley chilena. Cualquier controversia será
conocida por los tribunales competentes de Chile.

## Cambios

Podemos actualizar estos términos. La versión vigente es siempre la publicada
en esta página.`;

export const LEGAL_PAGE_TEMPLATES: readonly LegalPageTemplate[] = [
  {
    kind: 'privacidad',
    slug: 'politica-de-privacidad',
    title: 'Política de privacidad',
    description: 'Cómo tratamos los datos personales que nos entregas.',
    body: PRIVACY,
  },
  {
    kind: 'terminos',
    slug: 'terminos-y-condiciones',
    title: 'Términos y condiciones',
    description: 'Las condiciones de uso de este sitio.',
    body: TERMS,
  },
];

export const findLegalTemplate = (kind: string): LegalPageTemplate | undefined =>
  LEGAL_PAGE_TEMPLATES.find((template) => template.kind === kind);

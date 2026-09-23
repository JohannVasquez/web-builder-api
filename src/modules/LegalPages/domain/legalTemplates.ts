export type LegalPageKind = 'privacidad' | 'terminos' | 'compra' | 'cookies';

/**
 * Versión del juego de plantillas. Sube cada vez que cambia el texto de alguna, para poder
 * saber qué versión aceptó cada persona (ver el módulo `Consent`) y qué clientes están
 * publicando un texto viejo.
 */
export const LEGAL_TEMPLATES_VERSION = '2026-09';

export interface LegalPageTemplate {
  readonly kind: LegalPageKind;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly body: string;
}

/**
 * ESTO NO ES ASESORÍA LEGAL. Son borradores de trabajo, pensados para que un sitio no salga
 * a producción sin nada, no para reemplazar a un abogado. Cada cliente tiene que revisarlos
 * —idealmente con asesoría— antes de publicarlos: los plazos, las excepciones y las
 * finalidades dependen de qué vende y qué datos trata.
 *
 * Por eso las páginas legales nacen despublicadas (ver `CreateLegalPageUseCase`).
 */
export const LEGAL_REVIEW_NOTICE =
  'Este texto es un borrador de partida, no asesoría legal. Revísalo —idealmente con un ' +
  'abogado— y ajústalo a lo que realmente hace tu negocio antes de publicarlo.';

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

const PRIVACY = `## Quién responde por tus datos

{{siteName}} es responsable del tratamiento de los datos personales que recibe a través de
este sitio. Domicilio: {{address}}. Para cualquier asunto relacionado con tus datos,
escríbenos a {{contactEmail}}.

> **Antes de publicar**: agrega aquí tu razón social y tu RUT. Quien reclama tiene derecho a
> saber exactamente con quién está tratando, y el nombre comercial no siempre lo dice.

## Qué datos recogemos y para qué

**Los que nos entregas al escribirnos**: tu nombre, tu correo, tu teléfono si lo indicas y el
mensaje. Los usamos para responderte y hacerle seguimiento a tu consulta. La base que nos
habilita es tu consentimiento, que nos das al marcar la casilla del formulario.

**Los que nos entregas al comprar**, si esta tienda vende en línea: además de los anteriores,
tu RUT y tu dirección de despacho. Los usamos para preparar el pedido, emitir el documento
tributario y cumplir el contrato. La base que nos habilita es la ejecución de ese contrato y,
en el caso del documento tributario, una obligación legal.

**Los de navegación**, solo si aceptaste las cookies correspondientes. Ver la política de
cookies para el detalle de cada una.

No vendemos tus datos. No tomamos decisiones automatizadas que te afecten.

## Con quién los compartimos

Con los proveedores que necesitamos para operar: correo, alojamiento, almacenamiento de
archivos y, si los aceptaste, medición y publicidad. Cada uno trata los datos por encargo
nuestro y solo para lo que le pedimos.

Algunos de esos proveedores están fuera de Chile, así que tus datos pueden tratarse en el
extranjero. Elegimos proveedores que ofrecen un nivel de protección adecuado y les exigimos
las mismas obligaciones que asumimos aquí.

## Cuánto tiempo los guardamos

Cada dato se conserva mientras haga falta para lo que se recogió:

- Mensajes del formulario: mientras dure la consulta y su seguimiento comercial.
- Pedidos: el plazo que exige la normativa tributaria y de consumo.
- Suscripción a novedades: hasta que te des de baja.

Cumplido el plazo, los eliminamos o los dejamos anónimos.

## Tus derechos

Puedes pedirnos **acceder** a tus datos, **rectificarlos** si están mal, **suprimirlos**,
**oponerte** a que los tratemos y pedir su **portabilidad** a otro responsable. También
puedes retirar tu consentimiento cuando quieras, sin que eso afecte a lo que hicimos antes.

Escríbenos a {{contactEmail}} y te responderemos dentro del plazo que fija la Ley 21.719
sobre protección de datos personales. Si no quedas conforme, puedes reclamar ante la
Agencia de Protección de Datos Personales.

## Datos de menores de edad

Este sitio no está dirigido a menores de 14 años y no recogemos sus datos a sabiendas. Si
detectamos que recibimos datos de un menor sin autorización de quien lo representa, los
eliminamos.

## Seguridad

Aplicamos medidas técnicas y organizativas para proteger tus datos. Si ocurriera una brecha
que pueda afectarte, te lo comunicaremos y lo informaremos a la Agencia en los plazos que
exige la ley.

## Cookies

Este sitio usa cookies. Las necesarias funcionan siempre; las de medición y publicidad solo
si las aceptas, y puedes cambiar de opinión cuando quieras desde el enlace del pie. El
detalle está en la política de cookies.

## Cambios a esta política

Si la actualizamos, publicaremos la versión nueva en esta misma página. Cuando el cambio
afecte a algo que consentiste, volveremos a preguntártelo.`;

const COOKIES = `## Qué son

Una cookie es un archivo pequeño que un sitio guarda en tu navegador. Sirven para que el
sitio funcione, para recordar lo que elegiste y, algunas, para medir o mostrar publicidad.

## Cómo las controlas

Al entrar por primera vez te pedimos permiso. Las **necesarias** funcionan siempre, porque sin
ellas el sitio no anda. Las de **medición** y las de **publicidad** solo se activan si las
aceptas, y cada una por separado: aceptar la medición no autoriza la publicidad.

Puedes cambiar tu decisión cuando quieras desde **"Configurar cookies"**, en el pie de esta
página. Al rechazarlas, borramos las que ya estuvieran puestas.

También puedes bloquearlas o borrarlas desde tu navegador. Si bloqueas las necesarias, algunas
partes del sitio dejarán de funcionar.

## Cuáles usamos

### Necesarias

| Cookie | Para qué | Cuánto dura |
| --- | --- | --- |
| \`web-builder.consent\` | Recuerda qué cookies aceptaste, para no volver a preguntarte | 1 año |
| \`web-builder.consent-subject\` | Identifica tu decisión sin identificarte a ti | 1 año |
| \`web-builder.cart\` | Guarda tu carrito entre visitas (solo en sitios con tienda) | 30 días |

### Medición

Solo si las aceptas. Nos dicen qué páginas se visitan y desde dónde, para mejorar el sitio.
No te identifican.

| Cookie | Quién la pone | Cuánto dura |
| --- | --- | --- |
| \`_ga\`, \`_ga_*\` | Google Analytics | 2 años |
| \`_gid\` | Google Analytics | 24 horas |
| \`_gat\` | Google Analytics | 1 minuto |

### Publicidad

Solo si las aceptas. Permiten medir campañas y mostrarte anuncios en otras plataformas.
Implican enviar datos a terceros que operan fuera de Chile.

| Cookie | Quién la pone | Cuánto dura |
| --- | --- | --- |
| \`_fbp\` | Meta (Facebook, Instagram) | 90 días |
| \`_fbc\` | Meta | 90 días |
| \`_gcl_*\` | Google Ads | 90 días |

> Si tu sitio no tiene configurada alguna de estas herramientas, borra su fila: una política
> que declara cookies que no existen confunde tanto como una que omite las que sí.

## Quién responde

{{siteName}}, con domicilio en {{address}}. Para cualquier consulta sobre cookies o datos
personales, escríbenos a {{contactEmail}}.

## Cambios

Si cambiamos las cookies que usamos, actualizamos esta página y volvemos a pedirte permiso.`;

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

// Base para una tienda en Chile. Nace despublicada: cada tienda la revisa (idealmente con
// asesoría legal) antes de publicarla, porque plazos y excepciones dependen de lo que vende.
const PURCHASE = `## Quién vende

{{siteName}} es quien vende los productos de esta tienda. Si tienes dudas sobre tu
compra, escríbenos a {{contactEmail}} o llámanos al {{contactPhone}}. Dirección:
{{address}}.

## Precios y disponibilidad

Los precios están expresados en pesos chilenos e incluyen IVA. El precio que pagas
es el que aparece al confirmar tu compra. Los productos están sujetos a
disponibilidad: si alguno se agota antes de que confirmemos tu pedido, te lo
avisaremos y te devolveremos lo pagado por ese producto.

## Cómo se forma el contrato

Tu compra queda confirmada cuando recibes el correo con el número de pedido y se
registra el pago. Al comprar declaras haber leído y aceptado estos términos.

## Pago

Aceptamos los medios de pago que se muestran al finalizar la compra. Si pagas por
transferencia, preparamos tu pedido cuando recibimos el pago.

## Despacho y retiro

Los plazos y costos de despacho se informan antes de pagar, según la forma de envío
que elijas. Si eliges retiro, te avisaremos cuando tu pedido esté listo.

## Derecho a retracto

De acuerdo con la Ley 19.496 sobre Protección de los Derechos de los Consumidores,
en las compras a distancia puedes retractarte dentro de los 10 días siguientes a la
recepción del producto, salvo las excepciones que la ley permite (por ejemplo,
productos perecibles o hechos a tu medida). El producto debe devolverse sin uso y
con su embalaje original. Te devolveremos lo pagado una vez recibido.

## Garantía legal

Si un producto nuevo presenta una falla, dentro del plazo de garantía legal puedes
elegir entre su reparación gratuita, su cambio o la devolución de lo pagado.

## Cambios y devoluciones

Para ejercer tu derecho a retracto, tu garantía o solicitar un cambio, escríbenos a
{{contactEmail}} indicando tu número de pedido.

## Cambios a estos términos

Podemos actualizar estos términos. A cada compra se le aplican los vigentes al
momento de confirmarla.`;

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
  {
    kind: 'cookies',
    slug: 'politica-de-cookies',
    title: 'Política de cookies',
    description: 'Qué cookies usa el sitio, para qué y cuánto duran.',
    body: COOKIES,
  },
  {
    kind: 'compra',
    slug: 'terminos-de-compra',
    title: 'Términos y condiciones de compra',
    description: 'Precios, despacho, retracto, garantía y devoluciones de la tienda.',
    body: PURCHASE,
  },
];

export const findLegalTemplate = (kind: string): LegalPageTemplate | undefined =>
  LEGAL_PAGE_TEMPLATES.find((template) => template.kind === kind);

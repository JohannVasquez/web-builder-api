> **Este documento es un borrador de trabajo, no asesoría legal.** Se redactó a partir de cómo funciona la plataforma para definir las reglas de negocio base. **Antes de usarlo como base para firmar con clientes, tiene que pasar por un abogado.**
>
> **A quién le sirve:** A ventas y operaciones, para tener claras las reglas antes de vender; y luego a los clientes, como contrato de adhesión o anexo de servicio.
> **Cuándo leerlo:** Antes de lanzar comercialmente la plataforma o al redactar contratos definitivos.

# Términos de Servicio (Borrador)

Este documento define el acuerdo de servicio mensual entre la agencia y el cliente para la provisión, alojamiento y mantenimiento de su sitio web.

## 1. Qué incluye el plan mensual

El pago de la mensualidad garantiza el alojamiento de la página web, su correcto funcionamiento técnico y la actualización de su contenido. El servicio incluye:

- Alojamiento web (hosting) del sitio y gestión del servidor.
- Mantenimiento técnico, respaldos diarios y aplicación de parches de seguridad.
- Soporte técnico ante caídas o errores de la plataforma.
- **[[CANTIDAD DE CAMBIOS AL MES]]** modificaciones de contenido al mes (textos, imágenes, enlaces).
- Certificado SSL para navegación segura (HTTPS).

## 2. Tiempos de respuesta y niveles de servicio (SLA)

- **Solicitudes de cambios:** Las solicitudes de modificación de contenido incluidas en el plan se procesarán en un plazo máximo de **[[HORAS DE RESPUESTA A CAMBIOS]]** horas hábiles desde su recepción.
- **Soporte por caídas:** Los incidentes que interrumpan el acceso total al sitio web se atenderán en un plazo máximo de **[[HORAS DE RESPUESTA A CAÍDAS]]** horas hábiles.
- **Disponibilidad:** Se promete un tiempo de actividad (uptime) mensual del **[[PORCENTAJE DE UPTIME]]**%.

## 3. Qué NO está incluido y cómo se cotiza

Cualquier requerimiento que escape al mantenimiento normal y a la actualización de contenido base se considera un desarrollo adicional. Esto incluye, pero no se limita a:

- Rediseño completo de la estructura del sitio.
- Integraciones con sistemas externos o APIs nuevas.
- Creación de páginas nuevas o secciones complejas no contempladas en el plan original.
- Carga masiva de contenido.

Los desarrollos adicionales no cubiertos por la mensualidad se cotizarán por separado a un valor de **[[PRECIO HORA DESARROLLO]]** por hora, o mediante un presupuesto cerrado que el cliente deberá aprobar antes de su ejecución.

## 4. Propiedad del dominio y del contenido

- **Dominio:** Si el dominio (`.cl`, `.com`, etc.) fue comprado y registrado directamente por el cliente, es de su exclusiva propiedad. Si el dominio fue gestionado y pagado por la agencia como parte del servicio, la titularidad le pertenece a la agencia hasta que el cliente decida traspasarlo, sujeto al pago de **[[COSTO TRASPASO DOMINIO]]** por gastos de gestión. El subdominio de la plataforma (`.webbuilder.co` u otro provisto por defecto) es siempre propiedad de la plataforma.
- **Contenido:** Todos los textos, imágenes, logotipos y bases de datos de usuarios (registros de formularios) ingresados al sitio web son de propiedad exclusiva del cliente.
- **Plataforma y diseño:** El código fuente, la infraestructura tecnológica y el diseño de las plantillas pertenecen a la agencia.

## 5. Término del servicio y recuperación de datos

Si el cliente decide no continuar con el servicio, perderá el acceso a la plataforma web y el sitio será dado de baja.

- **Respaldo de contenido:** Tras el término del servicio, el cliente tiene un plazo de **[[DÍAS PARA PEDIR RESPALDO]]** días corridos para solicitar una copia de sus datos (textos, imágenes y base de datos de formularios). Esta copia se entregará en un formato estándar (como CSV o JSON para los datos, y un archivo comprimido para las imágenes). Pasado este plazo, la agencia borrará permanentemente la información de sus servidores.
- **Qué se lleva el cliente:** El cliente se lleva sus datos y su dominio (si es de su propiedad). No se entrega el código fuente de la página, la base de datos de la plataforma ni las plantillas de diseño, ya que son un servicio alojado (SaaS).

## 6. Duración, renovación y término anticipado

- **Duración:** El servicio no tiene un plazo forzoso de permanencia, salvo que se haya acordado un descuento por pago anual. Se renueva automáticamente de forma mensual.
- **Aviso de término:** Cualquiera de las dos partes puede poner fin al servicio dando aviso por escrito con al menos **[[DÍAS AVISO TÉRMINO]]** días de anticipación al próximo ciclo de facturación.
- **Cambio de precios:** La agencia podrá ajustar el valor de la mensualidad por inflación o cambio en las condiciones del mercado. Cualquier cambio de precio se notificará con al menos **[[DÍAS AVISO CAMBIO PRECIO]]** días de anticipación. Si el cliente no está de acuerdo, puede cancelar el servicio antes de que el nuevo precio entre en vigencia.

---

### Marcadores pendientes por definir:
- `[[CANTIDAD DE CAMBIOS AL MES]]`
- `[[HORAS DE RESPUESTA A CAMBIOS]]`
- `[[HORAS DE RESPUESTA A CAÍDAS]]`
- `[[PORCENTAJE DE UPTIME]]`
- `[[PRECIO HORA DESARROLLO]]`
- `[[COSTO TRASPASO DOMINIO]]`
- `[[DÍAS PARA PEDIR RESPALDO]]`
- `[[DÍAS AVISO TÉRMINO]]`
- `[[DÍAS AVISO CAMBIO PRECIO]]`

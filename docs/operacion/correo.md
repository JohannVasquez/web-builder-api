# Configuración de Correo

**Para quién es:** Administrador de sistemas o persona encargada de la infraestructura.
**Cuándo leerlo:** Al configurar el envío de correos en producción o diagnosticar por qué no llegan a la bandeja de entrada.

Para que los correos (transaccionales y del formulario de contacto) no caigan en spam, el proveedor de correo debe estar autorizado criptográficamente por nuestro dominio.

> PENDIENTE: Contratar servicio de envío de correos transaccionales (ej. Resend, SendGrid, Amazon SES) y obtener credenciales SMTP.

## 1. Registros DNS

El dominio de la plataforma necesita tres registros DNS para demostrar identidad. El proveedor de correo te dará los valores exactos, pero esto es lo que hacen y por qué importan:

- **SPF (Sender Policy Framework):** Un registro TXT que lista las IPs autorizadas para mandar correos en tu nombre. Si alguien usa nuestro dominio desde un servidor ajeno, el proveedor del destinatario lo rechaza.
- **DKIM (DomainKeys Identified Mail):** Un registro DNS con una llave pública. El servidor SMTP firma cada correo con la llave privada correspondiente. Gmail o Outlook usan la llave pública para asegurar que el mensaje no fue modificado en tránsito.
- **DMARC (Domain-based Message Authentication, Reporting, and Conformance):** Le dice al buzón de destino qué hacer si un correo falla en SPF o DKIM (ej. rechazarlo o mandarlo a spam).

## 2. Variables de entorno en la API

Busca tu archivo `.env` de producción e ingresa las credenciales de tu proveedor SMTP. Las variables exactas que la API lee hoy son:

```env
SMTP_HOST=smtp.proveedor.com
SMTP_PORT=587  # o 465
SMTP_SECURE=true
SMTP_USER=tu-usuario
SMTP_PASS=tu-contraseña
CONTACT_EMAIL_FROM=no-reply@tudominio.com
CONTACT_EMAIL_TO=contacto@tudominio.com
```

- **El remitente (`CONTACT_EMAIL_FROM`):** Tiene que pertenecer al dominio configurado con SPF y DKIM. Si envías usando el correo de la persona que rellenó el formulario (ej. cliente@gmail.com), los proveedores como Gmail rechazarán el mensaje por suplantación. La API siempre usa este remitente y pone al usuario en la cabecera _Reply-To_.
- **El destinatario (`CONTACT_EMAIL_TO`):** Es el correo de respaldo al que llega el mensaje si la tienda (tenant) no tiene un `contactEmail` configurado.
- **Respuestas de los prospectos (`DEMO_REPLY_TO`):** El aviso de vencimiento de una demo de prospecto sale desde `CONTACT_EMAIL_FROM` con esta dirección en _Reply-To_, para que la respuesta le llegue a la agencia. Vacía, se usa `CONTACT_EMAIL_FROM`. Ver [Demos](../demos.md#aviso-de-vencimiento).

## 3. Pruebas de entrega

Una vez aplicada la configuración:

1. Manda un correo de prueba (ej. a través de un formulario de contacto de la plataforma) hacia un buzón de Gmail y otro de Outlook.
2. Abre el mensaje recibido en Gmail, selecciona "Mostrar original" (Show original) y asegúrate de que **SPF**, **DKIM** y **DMARC** tengan el estado **PASS**.
3. También puedes enviar un correo a [Mail-Tester](https://www.mail-tester.com/) para una revisión en profundidad.

## 4. Qué hacer cuando falla un envío

- **Revisa la consola de tu proveedor SMTP:** Es el primer lugar donde buscar. Mostrarán por qué se rebotó el correo (bounce) o si hay bloqueos por reputación.
- **Verifica puertos de salida:** Proveedores de nube (como EC2 o DigitalOcean) a veces bloquean los puertos SMTP de salida (25, 587, 465) por defecto en cuentas nuevas para prevenir spam.
- **Revisa las claves:** Asegúrate de que `SMTP_PASS` no tenga caracteres extraños mal escapados en el `.env`.

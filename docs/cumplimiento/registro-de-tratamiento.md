# Registro de actividades de tratamiento

> Borrador de trabajo, no asesoría legal. Ver [README](README.md).

Qué datos personales trata la plataforma, con qué fin, dónde viven, cuánto duran y quién los
toca. Sale de leer el esquema, así que **al agregar un modelo con datos personales hay que
actualizarlo aquí**.

## Tratamientos

### 1. Consultas del formulario de contacto

|                     |                                                     |
| ------------------- | --------------------------------------------------- |
| **Responsable**     | El cliente dueño del sitio                          |
| **Encargada**       | La plataforma                                       |
| **Datos**           | Nombre, correo, teléfono (opcional), mensaje        |
| **Dónde**           | `contact_messages`                                  |
| **Base de licitud** | Consentimiento del titular (casilla del formulario) |
| **Fin**             | Responder la consulta y su seguimiento comercial    |
| **Conservación**    | 365 días, configurable (`RETENTION_CONTACT_DAYS`)   |
| **Destinatarios**   | Proveedor SMTP (copia del mensaje al cliente)       |

### 2. Suscripción a novedades

|                     |                                                                |
| ------------------- | -------------------------------------------------------------- |
| **Datos**           | Correo, fecha de alta, fecha de baja, token de baja            |
| **Dónde**           | `newsletter_subscribers`                                       |
| **Base de licitud** | Consentimiento                                                 |
| **Conservación**    | Mientras siga suscrito; 365 días tras la baja                  |
| **Derechos**        | Baja de un clic desde cualquier correo (art. 28 B, Ley 19.496) |

### 3. Pedidos de la tienda

|                     |                                                                        |
| ------------------- | ---------------------------------------------------------------------- |
| **Datos**           | Nombre, correo, teléfono, RUT (si pide factura), dirección de despacho |
| **Dónde**           | `orders`, `order_items`                                                |
| **Base de licitud** | Ejecución del contrato; obligación legal para el documento tributario  |
| **Conservación**    | 6 años (mínimo tributario). **No se borran: se anonimizan**            |
| **Destinatarios**   | Pasarela de pago (Flow), proveedor SMTP                                |

### 4. Consentimiento de cookies y formularios

|                     |                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Datos**           | Identificador de visitante, finalidades aceptadas, versión del texto, **huella** de IP |
| **Dónde**           | `consent_records`                                                                      |
| **Base de licitud** | Obligación legal (acreditar el consentimiento)                                         |
| **Conservación**    | No caduca: es la prueba del tratamiento. Se borra al ejercerse la supresión            |
| **Nota**            | De la IP se guarda una huella con sal, nunca la IP                                     |

### 5. Solicitudes de derechos y reclamos

|                     |                                                                    |
| ------------------- | ------------------------------------------------------------------ |
| **Datos**           | Correo, tipo de solicitud, detalle, hash del token de verificación |
| **Dónde**           | `data_rights_requests`, `consumer_claims`                          |
| **Base de licitud** | Obligación legal                                                   |
| **Conservación**    | Se conservan resueltas, para acreditar que se respondió en plazo   |

### 6. Prospectos de la agencia (demos de prospecto)

|                     |                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **Responsable**     | **La plataforma** (la agencia): el prospecto todavía no es cliente de nadie                      |
| **Datos**           | Nombre del negocio, nombre de contacto, teléfono, correo (opcional), rubro, origen, notas        |
| **Dónde**           | `prospects`; la demo asociada en `demos` (sin datos personales propios)                          |
| **Base de licitud** | Interés legítimo: contacto comercial con un negocio a partir de datos de fuentes públicas        |
| **Fin**             | Preparar y presentar una propuesta de sitio y hacer su seguimiento comercial                     |
| **Conservación**    | Mientras la demo exista; se borran con ella (etapa 2: 30 días tras vencer, configurable)         |
| **Destinatarios**   | Nadie fuera de la agencia. El enlace de la demo nunca expone la ficha                            |
| **Nota**            | La fila `demos` queda como registro **anónimo** para métricas (kit, rubro, vendedor, contadores) |

### 7. Visitas a las demos de prospecto

|                     |                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Responsable**     | La plataforma (la agencia)                                                                    |
| **Datos**           | Página abierta, fecha y hora, **huella** de IP con sal, agente de usuario recortado (255)     |
| **Dónde**           | `demo_visits`; contadores agregados (total, primera y última) en `demos`                      |
| **Base de licitud** | Interés legítimo: saber si el prospecto abrió la propuesta que se le envió                    |
| **Conservación**    | Se borran con la demo; los contadores agregados quedan en el registro anónimo                 |
| **Nota**            | Solo con el enlace del prospecto; el equipo no genera visitas. Nunca se guarda la IP en claro |

### 8. Usuarios del panel

|                     |                                          |
| ------------------- | ---------------------------------------- |
| **Responsable**     | **La plataforma** (aquí no es encargada) |
| **Datos**           | Nombre, correo, hash de contraseña       |
| **Dónde**           | `admin_users`, `password_resets`         |
| **Base de licitud** | Ejecución del contrato de servicio       |

## Subencargados

Terceros que tratan datos por cuenta de la plataforma. **Cada uno necesita su propio contrato**,
y el DPA con el cliente tiene que listarlos.

| Subencargado                              | Para qué                                    | ¿Fuera de Chile?      |
| ----------------------------------------- | ------------------------------------------- | --------------------- |
| Proveedor SMTP                            | Correos de contacto, pedidos y verificación | Depende del proveedor |
| Almacenamiento S3 (MinIO / Cloudflare R2) | Imágenes y archivos                         | R2 sí                 |
| Pasarela de pago (Flow)                   | Cobro                                       | No                    |
| Google Analytics / Tag Manager            | Medición, **solo con consentimiento**       | Sí                    |
| Meta Pixel                                | Publicidad, **solo con consentimiento**     | Sí                    |

> Los dos últimos no cargan sin permiso de su finalidad. Ver el módulo `Consent`.

## Medidas de seguridad

- Credenciales de cobro cifradas en reposo (AES-256-GCM, clave fuera de la base).
- Contraseñas del panel con hash; nunca en claro.
- Bucket privado: todo acceso pasa por una URL firmada de vida corta.
- De la IP se guarda una huella con sal, no la IP (consentimientos y visitas a demos).
- Los enlaces de las demos de prospecto se guardan como SHA-256, nunca en claro, y no se
  anotan en el registro de actividad.
- Cabeceras de seguridad y política de contenido en el sitio público.
- Aislamiento por cliente: toda consulta lleva `tenantId`.

## Lo que falta

- [ ] Contratos firmados con cada subencargado.
- [ ] Evaluación de impacto, si algún cliente llegara a tratar datos sensibles.
- [ ] Revisión por un abogado de todo este documento.

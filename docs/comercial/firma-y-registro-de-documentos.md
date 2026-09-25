> **Este documento es un borrador de trabajo.** Define la logística operativa para formalizar el inicio del servicio sin papeleo físico.
>
> **A quién le sirve:** A operaciones y ventas, para estandarizar el proceso de cierre con cada cliente.
> **Cuándo leerlo:** Al momento de definir cómo se formalizan los acuerdos comerciales y de cumplimiento.

# Firma y Registro de Documentos

Para mantener el proceso rápido y 100% digital, no imprimimos ni firmamos contratos en papel. Todo el paquete documental (Términos de Servicio y DPA - Encargo de Tratamiento) se aprueba de forma electrónica.

## 1. Proceso de firma digital

Cuando un prospecto acepta la propuesta comercial, se le envía un enlace para firmar el paquete de documentos de ingreso.

> PENDIENTE: Definir la plataforma de firma electrónica a utilizar (ej. Fintoc, Fondeadora, DocuSign, o un simple checkbox con registro de IP en nuestro propio flujo de onboarding). La decisión depende del presupuesto y el nivel de certeza legal que se quiera requerir para la firma.

El proceso general es:
1. Se genera un paquete (PDF o vista web) que consolida los Términos de Servicio y el DPA actualizados.
2. El cliente revisa y acepta mediante el mecanismo de firma elegido.
3. Al completarse, ambas partes reciben una copia inalterable del acuerdo con la marca de tiempo de la firma.

## 2. Qué queda registrado y dónde se guarda

Por cada cliente que aprueba, debemos mantener un registro auditable. 

Este registro ya está implementado en la API mediante el módulo `SignedDocuments`. Las firmas se guardan como hechos inmutables en la base de datos (ver tabla de rutas en [README.md](../../README.md)).

Independiente de la herramienta de firma elegida por ventas, la API guarda estrictamente:
- **Identidad del firmante:** Quién firmó en representación del cliente (nombre y RUT/DNI).
- **Fecha y hora:** Marca de tiempo exacta de la aceptación.
- **Versión de los documentos:** Un identificador claro (ej. `TOS-v1.2` y `DPA-v1.0`) o el hash del documento firmado.
- **El comprobante:** El PDF firmado o el log criptográfico que entrega el proveedor de firma.

## 3. Control de versiones de los documentos

Los Términos de Servicio y el DPA irán cambiando con el tiempo. Para saber qué condiciones aplican a cada cliente, seguimos este método:

1. **Versionado semántico:** Cada vez que se modifica un documento base en nuestros repositorios, se le asigna un número de versión explícito en el título (ej. "Términos de Servicio v2.0").
2. **Registro estático:** Al firmar, el cliente queda atado a la versión vigente en ese milisegundo. Nunca se asume que un cliente está en la "última versión" por defecto.
3. **Auditoría ante cambios:** Cuando sacamos una nueva versión, revisamos la base de datos o el CRM (ver *Pendiente* arriba) donde se guardan las firmas. Podemos filtrar fácilmente qué clientes están en versiones anteriores.
4. **Renegociación:** Si la nueva versión trae cambios críticos (ej. subida de precio o cambios drásticos en privacidad), se lanza una campaña para pedirles a los clientes antiguos que firmen la nueva versión (aceptación explícita). Si son cambios menores a favor del cliente, se les notifica por correo con un aviso de que los nuevos términos rigen a partir de X días.

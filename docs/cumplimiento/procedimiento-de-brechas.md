# Qué hacer ante una brecha de datos

> Borrador de trabajo, no asesoría legal. Ver [README](README.md).

Una brecha es cualquier acceso, pérdida o divulgación no autorizada de datos personales: una
base filtrada, una credencial comprometida, un bucket abierto por error, un correo con datos
enviado a quien no era.

**El reloj corre desde que se toma conocimiento, no desde que ocurrió.**

## Quién avisa a quién

La plataforma es **encargada**: no notifica a la Agencia. Notifica **al cliente**, que es el
responsable, y es él quien avisa a la Agencia y a los afectados.

```
Detección → la plataforma contiene y evalúa
          → avisa al cliente afectado        (sin dilación indebida)
          → el cliente notifica a la Agencia (y a los afectados si hay riesgo alto)
```

Si la brecha toca datos de los que la plataforma **sí** es responsable —los usuarios del
panel— entonces notifica ella directamente.

## Los pasos

### 1. Contener (primeras horas)

- Cortar el acceso: rotar credenciales, revocar tokens, apagar lo que esté filtrando.
- **No borrar registros.** Son la prueba de qué pasó y hasta dónde llegó.
- Anotar la hora de detección. Es la que cuenta.

### 2. Evaluar

- ¿Qué datos, de cuántas personas, de qué clientes?
- ¿Hay datos sensibles o que permitan suplantar a alguien?
- ¿Siguen expuestos?

### 3. Avisar al cliente — sin dilación indebida

Con lo que se sepa hasta ese momento; no se espera a tenerlo todo. Tiene que incluir:

- Qué pasó y cuándo se detectó.
- Qué datos y aproximadamente cuántas personas.
- Qué consecuencias puede tener para los afectados.
- Qué se hizo para contenerlo y qué se va a hacer.
- A quién preguntarle por más detalles.

### 4. Registrar

Toda brecha se anota, se haya notificado o no: qué pasó, qué se decidió y por qué. Si se
decidió no notificar, el motivo también se anota — esa decisión hay que poder defenderla.

### 5. Corregir

Arreglar la causa, no solo el síntoma, y revisar si el mismo agujero está en otra parte.

## Plantilla de aviso al cliente

```
Asunto: Incidente de seguridad que afecta datos de tu sitio

Detectamos un incidente el [fecha y hora] que puede haber afectado datos
personales tratados en tu sitio.

Qué pasó: [descripción]
Qué datos: [categorías]
A cuántas personas: [número aproximado]
Desde cuándo: [ventana de exposición]
Qué hicimos: [contención]
Qué sigue: [plan y plazos]

Como responsable del tratamiento, te corresponde evaluar si notificar a la
Agencia de Protección de Datos Personales y a las personas afectadas.
Quedamos disponibles para darte lo que necesites.

Contacto: [nombre y correo]
```

## Antes de que pase

- [ ] Definir quién es el contacto de incidentes y su suplente.
- [ ] Tener a mano los correos de contacto de cada cliente.
- [ ] Ensayar el procedimiento una vez al año.

> **Este documento es un borrador de trabajo.** Define el flujo operativo y técnico cuando falla el cobro mensual.
>
> **A quién le sirve:** A operaciones y facturación, para saber cómo proceder y qué botones apretar.
> **Cuándo leerlo:** Antes de pausar a un cliente o al configurar los avisos de cobranza.

# Política de Impago y Pausa de Servicio

Este documento describe los pasos a seguir cuando un cliente presenta un atraso en el pago de su mensualidad. 

> **Regla de oro:** Pausar un sitio es **SIEMPRE** una acción manual y deliberada de una persona de nuestro equipo. Nunca ocurre de forma automática por parte del sistema, y nunca se ejecuta sin haber enviado avisos previos al cliente.

## 1. Días de gracia y notificaciones

Cuando el intento de cobro mensual falla o la factura vence sin pago, comienza el periodo de gracia y el ciclo de avisos:

1. **Día 1 de atraso:** Se envía un aviso amistoso (correo o WhatsApp) informando que no se pudo procesar el pago o que la factura está vencida, con el link para regularizar. El sitio sigue funcionando normalmente.
2. **Día [[DÍAS AVISO 2]] de atraso:** Segundo aviso recordando el saldo pendiente y advirtiendo que el servicio podría ser suspendido si no se regulariza.
3. **Día [[DÍAS AVISO 3 - PRE-PAUSA]] de atraso:** Último aviso directo al cliente. Se le informa que, de no recibir el pago en las próximas 24 horas, el sitio web pasará a estado de pausa.

## 2. Pausa del sitio web

Si se cumple el plazo del último aviso y no hay pago ni acuerdo de pago, un administrador de la plataforma debe cambiar manualmente el estado del cliente.

A nivel de sistema, el modelo `Tenant` tiene un campo `status`. El administrador cambiará este valor de `active` a `paused`. 

**Qué significa estar en estado `paused`:**
- El sitio web deja de mostrar el diseño y contenido del cliente. En su lugar, responde con una pantalla genérica de mantención o aviso de suspensión.
- **El contenido no se borra.** El cliente conserva todos sus textos, imágenes, base de datos de formularios y configuraciones. Nada se elimina al pausar.
- El cliente no puede solicitar actualizaciones de contenido ni acceder a soporte técnico regular hasta regularizar su situación.

## 3. Eliminación definitiva de datos

Estar pausado no es permanente. Si un sitio permanece en estado `paused` por más de **[[DÍAS PARA ELIMINACIÓN DEFINITIVA]]** días corridos sin que el cliente responda o regularice su deuda, la agencia se reserva el derecho de dar de baja el servicio por completo y eliminar definitivamente los datos del servidor para liberar espacio. Antes de esta eliminación, se intentará un último contacto de cierre.

## 4. Reactivación del servicio

Si el cliente regulariza su deuda mientras está en estado `paused`:

1. El administrador verifica el pago.
2. Manualmente vuelve a cambiar el `status` del `Tenant` a `active`.
3. El sitio web vuelve a estar en línea inmediatamente, con todo el contenido exactamente como estaba antes de la pausa.

---

### Marcadores pendientes por definir:
- `[[DÍAS AVISO 2]]`
- `[[DÍAS AVISO 3 - PRE-PAUSA]]`
- `[[DÍAS PARA ELIMINACIÓN DEFINITIVA]]`

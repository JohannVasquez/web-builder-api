# Cobro de Mensualidad

La plataforma administra automáticamente el estado de cobro de los clientes de la agencia (al día, por vencer o atrasado). Esto te permite saber de un vistazo a quién hay que cobrarle este mes y tener proyecciones de ingresos reales sin tener que llevar una planilla manual paralela.

## ¿Cómo funciona el estado?

El sistema no te pide que vayas cliente por cliente marcando quién está "al día" y quién "atrasado". Tú simplemente configuras **el plan, la fecha de inicio y el día de cobro**. 

Cada vez que te pagan, **registras el pago**. Con solo mirar tu registro de pagos, el sistema calcula matemáticamente en qué estado está el cliente:
- **Al día**: Tienen pagos suficientes para cubrir los meses que llevan usando el servicio.
- **Por vencer**: Están al día, pero su próximo ciclo de cobro se cumple en los próximos 5 días.
- **Atrasado**: Han pasado más meses desde su inicio que los pagos que han hecho.

## Flujo mensual sugerido

1. **Revisar el mes**: A principios de mes, mira la lista global (`GET /api/admin/subscriptions`). Esto te mostrará a los clientes y el Ingreso Mensual Comprometido (MRR) total.
2. **Generar los cobros**: Puedes obtener el listado en formato CSV directamente usando (`GET /api/admin/subscriptions/export`). Con este CSV puedes emitir facturas, cargar los cobros masivos o enviar recordatorios a los que figuran como **por vencer**.
3. **Registrar pagos**: A medida que los clientes te depositan, usas el panel para anotar el pago. El estado de ese cliente volverá instantáneamente a estar "al día".
4. **Manejar atrasos**: Verás quién figura como "atrasado". Escríbeles y, si corresponde según tu política, **pausa su sitio**.

### Pausar un sitio por impago

**La plataforma NUNCA pausa un sitio sola.**
Cobrar es una acción comercial y humana: quizás le diste unos días más de plazo a un cliente de confianza, o quizás están en medio de una campaña fuerte y bajarles la página te costaría la relación comercial.

Si decides pausar un cliente por no pago:
- Entra al perfil del cliente y cambia su estado general (`Tenant`) a `paused`.
- El sitio dejará de verse de inmediato.
- **Toda la información del sitio se conserva.** Nada se borra.
- Cuando el cliente pague, simplemente vuelve a marcar el estado como `active` y el sitio estará en línea exactamente como lo dejaron.

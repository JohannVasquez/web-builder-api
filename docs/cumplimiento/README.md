# Cumplimiento: qué hay aquí y qué falta

> **Estos documentos son borradores de trabajo, no asesoría legal.** Los escribió el equipo
> de desarrollo a partir de cómo funciona la plataforma. **Antes de firmarlos con un cliente
> o presentarlos ante la Agencia, tienen que pasar por un abogado.** Lo que aportan es el
> inventario técnico —qué datos hay, dónde viven, quién los toca— que a un abogado le costaría
> semanas reconstruir y que aquí ya está.

La Ley 21.719 exige tener por escrito tres cosas que no se pueden improvisar el día de una
fiscalización. Además, aquí guardamos los términos que regulan la relación con el cliente:

| Documento                                                            | Qué exige la ley / Propósito | Estado                     |
| -------------------------------------------------------------------- | ---------------------------- | -------------------------- |
| [Registro de actividades de tratamiento](registro-de-tratamiento.md) | Art. 15 ter                  | Borrador completo          |
| [Contrato de encargo (DPA)](dpa-encargo-de-tratamiento.md)           | Art. 15 bis                  | Borrador, requiere abogado |
| [Procedimiento de brechas](procedimiento-de-brechas.md)              | Art. 14 quinquies            | Borrador completo          |
| [Términos de servicio](terminos-de-servicio.md)                      | Condiciones del servicio     | Borrador, requiere abogado |

## Por qué la plataforma es _encargada_ y no _responsable_

Es la distinción que ordena todo lo demás.

Cada cliente decide qué datos pide en su formulario, para qué los usa y cuánto los guarda:
**el cliente es el responsable**. La plataforma solo los trata por encargo suyo, siguiendo sus
instrucciones: **la plataforma es la encargada**.

Eso significa que:

- El contrato de encargo (DPA) va **entre la plataforma y cada cliente**, y lo firma cada uno.
- El registro de actividades lo necesita **cada responsable**; el de aquí es el de la
  plataforma como encargada, y sirve de base para el de cada cliente.
- Ante una brecha, quien notifica a la Agencia es el **responsable**. La plataforma tiene que
  avisarle _sin dilación indebida_ para que pueda hacerlo a tiempo.

La única excepción son los datos de los propios clientes de la agencia (los `AdminUser`): ahí
la plataforma sí es responsable.

# Contrato de encargo de tratamiento (DPA)

> **Borrador. NO firmar sin que lo revise un abogado.** Un DPA es un contrato: lo que dice
> obliga. Lo que sigue describe con precisión **qué hace la plataforma técnicamente**, que es
> la parte que un abogado no puede escribir solo; la redacción jurídica es suya.

Va entre la plataforma (encargada) y cada cliente (responsable). Sin él, el art. 15 bis de la
Ley 21.719 no se cumple, por bien que funcione todo lo demás.

---

## 1. Objeto

El responsable encarga a la encargada el tratamiento de los datos personales necesarios para
operar su sitio: presencia web, blog y tienda en línea.

## 2. Qué se trata

- **Categorías de titulares**: visitantes del sitio, personas que escriben por el formulario,
  suscriptores y compradores.
- **Categorías de datos**: identificación y contacto, datos de compra y despacho, RUT cuando
  se pide factura, datos de navegación bajo consentimiento.
- **No se tratan datos sensibles.** Si el responsable quisiera tratarlos, hay que revisar este
  contrato antes.
- **Duración**: mientras dure el servicio.

El detalle está en el [registro de actividades](registro-de-tratamiento.md).

## 3. Obligaciones de la encargada

1. Tratar los datos **solo siguiendo instrucciones** del responsable, salvo obligación legal.
2. Guardar confidencialidad, y exigírsela a quien tenga acceso.
3. Aplicar las medidas de seguridad del punto 5.
4. No subcontratar sin autorización. Los subencargados actuales están en el punto 6; un
   cambio se avisa con antelación y el responsable puede oponerse.
5. **Ayudar al responsable a responder los derechos ARCOP** — la plataforma tiene el flujo
   implementado, con verificación por correo y control de plazo.
6. **Avisar de una brecha sin dilación indebida**, según el
   [procedimiento](procedimiento-de-brechas.md).
7. Al terminar el servicio, devolver o eliminar los datos a elección del responsable, salvo lo
   que una ley obligue a conservar.
8. Poner a disposición lo necesario para acreditar el cumplimiento.

## 4. Obligaciones del responsable

1. Tener una base de licitud para cada tratamiento que encarga.
2. Publicar su política de privacidad y mantenerla al día. Las plantillas de la plataforma son
   un punto de partida, **no asesoría legal**.
3. No cargar en la plataforma datos sensibles ni categorías no previstas.
4. Responder los derechos de los titulares y notificar las brechas a la Agencia.

## 5. Medidas de seguridad

- Credenciales de cobro cifradas en reposo con AES-256-GCM; la clave vive fuera de la base.
- Contraseñas del panel con hash.
- Almacenamiento privado: todo acceso pasa por una URL firmada de vida corta.
- De la dirección IP se guarda una huella con sal, nunca la IP.
- Cabeceras de seguridad y política de contenido en el sitio público.
- Aislamiento por cliente en cada consulta.
- Borrado y anonimización automáticos al cumplirse los plazos de conservación.

## 6. Subencargados

Los listados en el [registro](registro-de-tratamiento.md#subencargados). Algunos tratan datos
**fuera de Chile** —almacenamiento, medición y publicidad—; el responsable lo autoriza al
firmar y debe declararlo en su política de privacidad.

## 7. Transferencias internacionales

Las del punto 6. La encargada elige proveedores que ofrezcan un nivel de protección adecuado y
les exige obligaciones equivalentes a las de este contrato.

---

## Para el abogado

Puntos que conviene mirar con cuidado:

- **Responsabilidad y límites**: no hay cláusula redactada. Es lo primero que falta.
- **Auditorías**: con qué frecuencia y a costa de quién.
- **Plazo de aviso de brecha**: aquí dice "sin dilación indebida"; conviene fijar horas.
- **Devolución al terminar**: en qué formato y en qué plazo.
- **Ley aplicable y tribunales**: no está dicho.

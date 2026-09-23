/**
 * Días de retracto que da la Ley 19.496 en las compras a distancia. Vive aquí y no en cada
 * texto porque lo repiten la plantilla de términos, el dato estructurado del producto y el
 * correo de confirmación: si los números se separan, el sitio se contradice solo.
 */
export const RETRACTO_DIAS = 10;

export const RETRACTO_TEXTO = [
  `Derecho a retracto: tienes ${String(RETRACTO_DIAS)} días corridos desde que recibes el`,
  'producto para arrepentirte, salvo las excepciones que permite la Ley 19.496 (por ejemplo,',
  'productos hechos a tu medida o perecibles). El producto debe devolverse sin uso y con su',
  'embalaje. Para ejercerlo, responde este correo indicando tu número de pedido.',
];

// Detecta gastos que parecen repetidos: misma persona, local, ítem, cantidad, unidad, monto, fecha,
// medio de pago y motivo. No los elimina: solo ayuda a revisarlos (puede haber compras idénticas reales).
const idDe = (v) => String((v && v._id) || v || '');

export function claveRepetido(g) {
  return [
    idDe(g.usuario), idDe(g.local), idDe(g.productoCatalogoId) || String(g.productoNombre || ''), g.cantidad, g.unidadMedida, g.monto,
    String(g.fecha).slice(0, 10), g.medioPago, String(g.motivo || '').trim().toLowerCase()
  ].join('|');
}

export const SIN_REPETIDOS = { porId: new Map(), grupos: 0, sobrantes: 0, montoSobrante: 0, filas: 0 };

// porId: _id del gasto -> { veces } (cuántos gastos idénticos hay en su grupo).
// sobrantes / montoSobrante: lo que sobraría si de cada grupo se conservara solo uno.
export function detectarRepetidos(gastos) {
  const grupos = new Map();
  for (const g of gastos) {
    const k = claveRepetido(g);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(g);
  }
  const resultado = { porId: new Map(), grupos: 0, sobrantes: 0, montoSobrante: 0, filas: 0 };
  for (const lista of grupos.values()) {
    if (lista.length < 2) continue;
    resultado.grupos += 1;
    resultado.filas += lista.length;
    resultado.sobrantes += lista.length - 1;
    resultado.montoSobrante += (lista.length - 1) * lista[0].monto;
    for (const g of lista) resultado.porId.set(g._id, { veces: lista.length });
  }
  return resultado;
}

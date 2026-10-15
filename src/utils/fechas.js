// Utilidades de fecha del dashboard.
//
// - Los días elegidos en pantalla ("hoy", "esta semana") se manejan en hora LOCAL.
// - La fecha de un gasto se guarda como día de calendario a medianoche UTC, así que se LEE en UTC;
//   si no, en Chile aparecería un día antes.

export const MESES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function fechaLocalISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatearFechaGasto(valor) {
  return new Date(valor).toLocaleDateString('es-CL', { timeZone: 'UTC' });
}

// "2026-10-14" -> "14 oct" (el ISO es un día de calendario, se interpreta sin zona horaria)
export function diaMesCorto(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES_LARGOS[m - 1].slice(0, 3)}`;
}

export function diaMesLargo(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES_LARGOS[m - 1]}`;
}

export function mesActual() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
}

export function opcionesMeses() {
  const opciones = [];
  const base = new Date();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const etiqueta = `${MESES_LARGOS[d.getMonth()]} de ${d.getFullYear()}`;
    opciones.push({ valor, etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1) });
  }
  return opciones;
}

// A partir de cualquier día, el lunes y el domingo de esa semana (convención CL).
export function rangoSemana(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  const diaSemana = fecha.getDay(); // 0 = domingo
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + offsetLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { desde: fechaLocalISO(lunes), hasta: fechaLocalISO(domingo) };
}

// Días entre dos fechas ISO (a - b). Sirve para "hace N días".
export function diasEntre(aISO, bISO) {
  const [ya, ma, da] = aISO.split('-').map(Number);
  const [yb, mb, db] = bISO.split('-').map(Number);
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86400000);
}

export function textoUltimoRegistro(ultimoISO, hoyISO) {
  if (!ultimoISO) return 'sin registros';
  const dias = diasEntre(hoyISO, ultimoISO);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

// Reglas (puras) de la revisión de gastos: quién puede aprobar, rechazar, reabrir o corregir. Son un espejo de las del
// servidor, que es quien decide de verdad: si esto y el servidor no coincidieran, el servidor rechaza la acción.
//
// La revisión es por BOLETA COMPLETA: todos sus productos se aprueban o se rechazan juntos.
export const ESTADOS = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
export const ETIQUETA_ESTADO = { PENDIENTE: 'Pendiente', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado' };
export const COLOR_ESTADO = {
  PENDIENTE: { color: '#8A6D3B', bg: '#F5EBDA' },
  APROBADO: { color: '#3B7A57', bg: '#E1EFE6' },
  RECHAZADO: { color: '#F20000', bg: '#FBE3E3' }
};
export const ROLES_REVISORES = ['MASTER', 'ANALISTA', 'GERENCIA'];
export const MOTIVO_RECHAZO_MIN = 5;

const idDe = (v) => String((v && v._id) || v || '');

// Un gasto sin estado (anterior a la revisión, aún sin migrar) cuenta como pendiente.
export const estadoDe = (g) => (g && g.estado) || 'PENDIENTE';

// Identifica la boleta de un gasto: su documentoId o, en los gastos antiguos de un solo producto, el id del gasto.
export const claveBoleta = (g) => g.documentoId || String(g._id);

export function puedeRevisar(usuario) {
  return !!usuario && ROLES_REVISORES.includes(usuario.rol);
}

// Quienes pueden subir gastos (y por lo tanto, corregirlos).
export function puedeSubirGastos(usuario) {
  return !!usuario && (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'MASTER');
}

// `boleta.subidoPor` (boleta agrupada) o `gasto.usuario` (gasto suelto): quién la subió.
const subidoPorId = (x) => idDe(x.subidoPor || x.usuario);

// ¿Puede este usuario aprobar o rechazar la boleta? Solo las pendientes, y nunca las que subió él mismo.
export function puedeRevisarBoleta(usuario, boleta) {
  return puedeRevisar(usuario) && estadoDe(boleta) === 'PENDIENTE' && subidoPorId(boleta) !== String(usuario.id);
}

// ¿Puede corregir esta boleta rechazada? El administrador, solo las que subió; el MASTER, cualquiera.
export function puedeCorregirBoleta(usuario, boleta) {
  if (!puedeSubirGastos(usuario) || estadoDe(boleta) !== 'RECHAZADO') return false;
  return usuario.rol === 'MASTER' || subidoPorId(boleta) === String(usuario.id);
}

// ¿Puede reabrir la revisión de un gasto ya decidido? Quien decidió, o un MASTER.
export function puedeReabrir(usuario, gasto) {
  if (!puedeRevisar(usuario) || estadoDe(gasto) === 'PENDIENTE') return false;
  return usuario.rol === 'MASTER' || (!!gasto.revisadoPor && idDe(gasto.revisadoPor) === String(usuario.id));
}

// Filtro de estado del Detalle. "Vigentes" (por defecto) deja fuera los rechazados, igual que los totales.
export const FILTROS_ESTADO = [
  { valor: 'VIGENTES', etiqueta: 'Vigentes', coincide: (e) => e !== 'RECHAZADO' },
  { valor: 'PENDIENTE', etiqueta: 'Pendientes', coincide: (e) => e === 'PENDIENTE' },
  { valor: 'APROBADO', etiqueta: 'Aprobados', coincide: (e) => e === 'APROBADO' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazados', coincide: (e) => e === 'RECHAZADO' },
  { valor: 'TODOS', etiqueta: 'Todos', coincide: () => true }
];
export function coincideEstado(filtro, gasto) {
  const f = FILTROS_ESTADO.find((x) => x.valor === filtro) || FILTROS_ESTADO[0];
  return f.coincide(estadoDe(gasto));
}

// ---------- Motivos rápidos de rechazo ----------
export const MOTIVOS_RAPIDOS = [
  'Falta documento válido',
  'Montos no coinciden',
  'Fecha no coincide',
  'Faltan datos de contacto',
  'Sin foto de respaldo'
];
export const MOTIVO_MAX = 500; // igual que en el servidor

// El motivo que ve quien subió la boleta: los motivos marcados y, si se quiere, un comentario propio, separados por ". ".
export function armarMotivoRechazo(seleccionados, comentario) {
  return [...(seleccionados || []), String(comentario || '').trim()].filter(Boolean).join('. ');
}

// ---------- Exportar ----------
export const ETIQUETA_ACCION = { CREADO: 'Subido', ELIMINADO: 'Eliminado', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado', EDITADO: 'Corregido', REABIERTO: 'Reabierto' };
const SUFIJO_ESTADO = { PENDIENTE: 'pendientes', APROBADO: 'aprobados', RECHAZADO: 'rechazados' };

// Nombre del archivo: el base si se exportan todos los estados; si no, con los estados elegidos (gastos-2026-11-rechazados).
export function nombreExportacion(base, estados) {
  const elegidos = ESTADOS.filter((e) => estados.includes(e));
  return elegidos.length === ESTADOS.length ? base : `${base}-${elegidos.map((e) => SUFIJO_ESTADO[e]).join('-')}`;
}

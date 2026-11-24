import api from './api';

// Cuántas boletas hay por revisar, rechazadas y por corregir (para los avisos y contadores).
export async function obtenerResumenRevision() {
  const { data } = await api.get('/gastos/revision/resumen');
  return data;
}

// Boletas (agrupadas con sus productos) por estado. Parámetros: estado (PENDIENTE,RECHAZADO…), locales,
// propios=1 (solo las que subió quien pregunta) y excluirPropios=1 (sin las que subió quien pregunta).
export async function listarBoletas(params) {
  const { data } = await api.get('/gastos/revision/documentos', { params });
  return data;
}

// decision: 'APROBAR' | 'RECHAZAR' (el rechazo exige motivo). Devuelve { documentos, gastos, omitidos: [{ id, error }] }.
export async function revisarBoletas({ decision, documentos, motivo }) {
  const { data } = await api.post('/gastos/revision', { decision, documentos, motivo });
  return data;
}

// Devuelve a pendiente lo ya aprobado o rechazado (para corregir un error al revisar).
export async function reabrirBoletas({ documentos, motivo }) {
  const { data } = await api.post('/gastos/revision/reabrir', { documentos, motivo });
  return data;
}

// Una boleta con todos sus productos (para corregirla).
export async function obtenerBoleta(id) {
  const { data } = await api.get(`/gastos/documento/${encodeURIComponent(id)}`);
  return data;
}

// Envía la corrección de una boleta rechazada: vuelve a revisión.
export async function corregirBoleta(id, payload) {
  const { data } = await api.put(`/gastos/documento/${encodeURIComponent(id)}`, payload);
  return data;
}

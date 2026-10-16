import api from './api';

// Eventos de "subido" y "eliminado". Parámetros: desde / hasta (fecha-hora ISO), locales, medioPago, accion.
export async function obtenerHistorialGastos(params) {
  const { data } = await api.get('/historial-gastos', { params });
  return data;
}

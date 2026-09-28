import api from './api';

export async function listarGastos(params) {
  const { data } = await api.get('/gastos', { params });
  return data;
}

export async function eliminarGasto(id) {
  const { data } = await api.delete(`/gastos/${id}`);
  return data;
}

export async function obtenerResumen(params) {
  const { data } = await api.get('/gastos/estadisticas/resumen', { params });
  return data;
}

export async function obtenerPorCuentaContable(params) {
  const { data } = await api.get('/gastos/estadisticas/por-cuenta-contable', { params });
  return data;
}

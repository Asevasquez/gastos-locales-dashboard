import api from './api';

export async function listarGastos(params) {
  const { data } = await api.get('/gastos', { params });
  return data;
}

// El motivo es obligatorio: queda guardado en el historial junto con quién eliminó el gasto.
export async function eliminarGasto(id, motivo) {
  const { data } = await api.delete(`/gastos/${id}`, { data: { motivo } });
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

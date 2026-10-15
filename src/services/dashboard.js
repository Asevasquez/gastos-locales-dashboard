import api from './api';

// Cada pestaña del dashboard pide solo lo suyo. Parámetros: mes=YYYY-MM  ó  desde/hasta=YYYY-MM-DD,
// locales=id1,id2 y medioPago=A,B (el backend siempre los limita a los locales permitidos al usuario).
export async function obtenerDashboardResumen(params) {
  const { data } = await api.get('/dashboard/resumen', { params });
  return data;
}

export async function obtenerDashboardLocales(params) {
  const { data } = await api.get('/dashboard/locales', { params });
  return data;
}

export async function obtenerDashboardControl(params) {
  const { data } = await api.get('/dashboard/control', { params });
  return data;
}

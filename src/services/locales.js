import api from './api';

export async function listarLocales() {
  const { data } = await api.get('/locales');
  return data;
}

export async function crearLocal(payload) {
  const { data } = await api.post('/locales', payload);
  return data;
}

export async function actualizarLocal(id, payload) {
  const { data } = await api.put(`/locales/${id}`, payload);
  return data;
}

export async function eliminarLocal(id) {
  const { data } = await api.delete(`/locales/${id}`);
  return data;
}

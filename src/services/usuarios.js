import api from './api';

export async function listarUsuarios() {
  const { data } = await api.get('/usuarios');
  return data;
}

export async function crearUsuario(payload) {
  const { data } = await api.post('/usuarios', payload);
  return data;
}

export async function actualizarUsuario(id, payload) {
  const { data } = await api.put(`/usuarios/${id}`, payload);
  return data;
}

export async function asignarLocales(id, localesAsignados) {
  const { data } = await api.put(`/usuarios/${id}/locales`, { localesAsignados });
  return data;
}

export async function eliminarUsuario(id) {
  const { data } = await api.delete(`/usuarios/${id}`);
  return data;
}

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

// Sube la foto de la boleta (el servidor acepta JPG, PNG o WEBP de hasta 8 MB) y devuelve su dirección.
export async function subirFoto(archivo) {
  const formData = new FormData();
  formData.append('foto', archivo, archivo.name);
  const { data } = await api.post('/gastos/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000 // subir una foto por una conexión lenta puede tardar más que una consulta normal
  });
  return data.url;
}

// Registra una boleta o factura con uno o más productos. Devuelve { documentoId, numeroDocumento, folio, total, gastos }.
export async function crearDocumento(payload) {
  const { data } = await api.post('/gastos/documento', payload);
  return data;
}

// Sube la foto UNA vez y registra el documento. Si el envío falla, el error trae `fotoBoletaUrl` con la foto ya
// subida, para reintentar (por ejemplo, tras preguntar por un folio repetido) sin subirla de nuevo.
export async function crearDocumentoConFoto(payloadSinFoto, archivo, { fotoBoletaUrl } = {}) {
  let url = fotoBoletaUrl || null;
  try {
    if (!url) url = await subirFoto(archivo);
    return await crearDocumento({ ...payloadSinFoto, fotoBoletaUrl: url });
  } catch (err) {
    if (url && err && typeof err === 'object') err.fotoBoletaUrl = url;
    throw err;
  }
}

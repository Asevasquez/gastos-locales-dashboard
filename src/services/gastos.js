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

// Sube las fotos de la boleta (de 1 a 3, una por una y en orden) y registra el documento. Cada foto se sube UNA
// sola vez: si el envío falla, el error trae `urlsFotos` ({ [id de la foto]: dirección }) con las que ya se
// subieron, para reintentar (por ejemplo, tras preguntar por un folio repetido) subiendo solo las que faltan.
//   fotos: [{ id, archivo }]      urlsPrevias: { [id]: dirección } de intentos anteriores
export async function crearDocumentoConFotos(payloadSinFotos, fotos, { urlsPrevias = {} } = {}) {
  const urls = { ...urlsPrevias };
  try {
    for (const foto of fotos) {
      if (!urls[foto.id]) urls[foto.id] = await subirFoto(foto.archivo);
    }
    return await crearDocumento({ ...payloadSinFotos, fotosBoletaUrls: fotos.map((foto) => urls[foto.id]) });
  } catch (err) {
    if (err && typeof err === 'object') err.urlsFotos = urls;
    throw err;
  }
}

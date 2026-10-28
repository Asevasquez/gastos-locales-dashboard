import api from './api';

export async function buscarItems(q) {
  const { data } = await api.get('/catalogo/buscar', { params: { q } });
  return data;
}

export async function obtenerCategorias() {
  const { data } = await api.get('/catalogo/categorias');
  return data;
}

export async function obtenerCuentasContables() {
  const { data } = await api.get('/catalogo/cuentas-contables');
  return data;
}

// Sube el Excel del catálogo (ITEM, DETALLE, RATIO, CUENTA CONTABLE) — reemplaza
// el importador que antes sincronizaba con Bsale.
export async function importarCatalogoExcel(archivo) {
  const formData = new FormData();
  formData.append('archivo', archivo);
  const { data } = await api.post('/catalogo/importar-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

// Todos los ítems activos (item, detalle, ratio, cuentaContable): es una lista corta y sirve para buscar en pantalla.
export async function obtenerCatalogoCompleto() {
  const { data } = await api.get('/catalogo/completo');
  return data;
}

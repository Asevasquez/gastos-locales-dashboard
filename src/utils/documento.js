// Reglas (puras) del ingreso de una boleta o factura con uno o más productos desde la web. Son las mismas que usa
// la app del teléfono; el servidor vuelve a validar todo.
import { MAX_FOTOS } from './fotos';

export const MAX_PRODUCTOS = 30;
export const FOLIO_MAX = 30;

export const UNIDADES = ['UN', 'KG', 'LT', 'GR'];

// Clave única de la boleta: si el envío se repite (doble clic, reintento) el servidor devuelve lo ya guardado en
// vez de crear otra.
export function claveNueva() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// Devuelve el mensaje de error, o null si el folio sirve.
export function validarFolio(texto) {
  const folio = String(texto == null ? '' : texto).trim().replace(/\s+/g, ' ');
  if (!folio) return 'Ingresa el número de documento o folio de la boleta';
  if (folio.length > FOLIO_MAX) return `El folio no puede tener más de ${FOLIO_MAX} caracteres`;
  const soloAlfanumerico = folio.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!soloAlfanumerico || /^0+$/.test(soloAlfanumerico)) {
    return 'El folio no es válido: escribe el número que aparece en el documento';
  }
  return null;
}

// ¿El formulario del producto actual está sin tocar? (el motivo no cuenta: se precarga con el del producto anterior)
export function editorVacio({ productoTexto, productoSeleccionado, cantidad, monto }) {
  return (
    !productoSeleccionado &&
    !String(productoTexto || '').trim() &&
    !String(cantidad || '').trim() &&
    !String(monto || '').trim()
  );
}

export function validarLinea({ productoSeleccionado, cantidad, monto, motivo }) {
  if (!productoSeleccionado) return 'Selecciona un producto de la lista';
  if (!cantidad || parseFloat(cantidad) <= 0) return 'Ingresa una cantidad válida';
  if (!monto || parseFloat(monto) <= 0) return 'Ingresa un monto válido';
  if (!String(motivo || '').trim()) return 'Ingresa el motivo del gasto';
  return null;
}

let contador = 0;
export function crearLinea({ productoSeleccionado, cantidad, unidad, monto, motivo }) {
  contador += 1;
  return {
    id: `l${Date.now().toString(36)}${contador}`,
    productoCatalogoId: productoSeleccionado._id,
    productoNombre: productoSeleccionado.item,
    categoria: productoSeleccionado.ratio,
    cuentaContable: productoSeleccionado.cuentaContable,
    cantidad: parseFloat(cantidad),
    unidad,
    monto: parseFloat(monto),
    motivo: String(motivo).trim()
  };
}

export function totalDocumento(lineas) {
  return lineas.reduce((acc, l) => acc + l.monto, 0);
}

export function textoProductos(n) {
  return `${n} ${n === 1 ? 'producto' : 'productos'}`;
}

// Validación de todo el documento (con las líneas ya reunidas). Devuelve el mensaje de error, o null.
export function validarDocumento({ local, fecha, folio, medioPago, fotos, lineas, hoy }) {
  if (!local) return 'Selecciona el local';
  if (!fecha) return 'Ingresa la fecha del gasto';
  if (hoy && fecha > hoy) return 'La fecha del gasto no puede ser futura';
  const errorFolio = validarFolio(folio);
  if (errorFolio) return errorFolio;
  if (!medioPago) return 'Selecciona el medio de pago';
  if (!fotos || fotos.length === 0) return 'Adjunta al menos una foto de la boleta o factura';
  if (fotos.length > MAX_FOTOS) return `Una boleta puede tener hasta ${MAX_FOTOS} fotos`;
  if (lineas.length === 0) return 'Agrega al menos un producto';
  if (lineas.length > MAX_PRODUCTOS) return `Una boleta puede tener hasta ${MAX_PRODUCTOS} productos`;
  return null;
}

// Cuerpo que se envía al servidor (sin la foto: la agrega el servicio una vez subida).
export function armarPayloadDocumento({ claveDocumento, local, folio, fecha, medioPago, lineas, confirmarFolioRepetido }) {
  return {
    claveDocumento,
    local: local._id || local,
    folio: String(folio).trim(),
    fecha,
    medioPago,
    items: lineas.map((l) => ({
      productoCatalogoId: l.productoCatalogoId,
      cantidad: l.cantidad,
      unidadMedida: l.unidad,
      monto: l.monto,
      motivo: l.motivo
    })),
    ...(confirmarFolioRepetido ? { confirmarFolioRepetido: true } : {})
  };
}

// Foto de la boleta en el navegador: se valida y, si se puede, se reduce antes de subirla (una foto de celular
// pesa varios MB y el servidor rechaza más de 8 MB). Si algo falla al reducirla, se usa la original.
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FOTO_ORIGINAL_MB = 25; // máximo que se acepta elegir (después se reduce)
export const MAX_FOTO_ENVIO_MB = 8; // máximo que acepta el servidor

const MB = 1024 * 1024;

// Devuelve el mensaje de error, o null si la foto sirve.
export function validarFoto(archivo) {
  if (!archivo) return 'Selecciona una foto';
  if (!TIPOS_FOTO.includes(archivo.type)) return 'Formato no permitido. Sube una imagen JPG, PNG o WEBP.';
  if (archivo.size > MAX_FOTO_ORIGINAL_MB * MB) return `La foto pesa más de ${MAX_FOTO_ORIGINAL_MB} MB. Usa una imagen más liviana.`;
  return null;
}

function nombreJpg(nombre) {
  return `${String(nombre || 'boleta').replace(/\.[^.]+$/, '')}.jpg`;
}

// Reduce la foto a un máximo de `maxLado` píxeles y la guarda como JPEG. `dependencias` permite reemplazar las
// funciones del navegador (lo usan las pruebas).
export async function prepararFoto(archivo, { maxLado = 1600, calidad = 0.8, dependencias = {} } = {}) {
  const crearBitmap = dependencias.crearBitmap || (typeof createImageBitmap === 'function' ? (f) => createImageBitmap(f, { imageOrientation: 'from-image' }) : null);
  const crearCanvas = dependencias.crearCanvas || (() => document.createElement('canvas'));
  if (!crearBitmap) return archivo;

  try {
    const bitmap = await crearBitmap(archivo);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const canvas = crearCanvas();
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();

    const blob = await new Promise((resolver) => canvas.toBlob(resolver, 'image/jpeg', calidad));
    if (!blob) return archivo;
    // si ya era liviana y la "reducción" pesa igual o más, se deja la original
    if (blob.size >= archivo.size && archivo.type === 'image/jpeg') return archivo;
    return new File([blob], nombreJpg(archivo.name), { type: 'image/jpeg' });
  } catch (err) {
    return archivo;
  }
}

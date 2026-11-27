// Zoom y giro de la foto de una boleta en el visor.
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 5;
const PASO = 1.25;

export const limitarZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 1000) / 1000));
export const acercar = (z) => limitarZoom(z * PASO);
export const alejar = (z) => limitarZoom(z / PASO);
// Giro en grados, de 90 en 90: 0, 90, 180, 270. `direccion` = 1 (derecha) o -1 (izquierda).
export const girar = (grados, direccion) => (((grados + direccion * 90) % 360) + 360) % 360;
// De costado (90° o 270°) el ancho y el alto se intercambian.
export const deCostado = (grados) => grados % 180 !== 0;
export const transformacion = ({ x, y, zoom, giro }) => `translate(${x}px, ${y}px) scale(${zoom}) rotate(${giro}deg)`;

// Espejo de la regla del backend para decidir si se muestra el botón de eliminar. El backend es
// quien decide de verdad: si esto y el servidor no coincidieran, el servidor rechaza la acción.
//   MASTER: cualquier gasto.
//   ADMINISTRADOR: solo los gastos que él subió y solo durante el mes en que los subió.
//   Otros roles: ninguno.
export function puedeEliminarGasto(usuario, gasto) {
  if (!usuario) return false;
  if (usuario.rol === 'MASTER') return true;
  if (usuario.rol !== 'ADMINISTRADOR') return false;

  const dueno = String((gasto.usuario && gasto.usuario._id) || gasto.usuario || '');
  if (dueno !== String(usuario.id)) return false;

  const subido = new Date(gasto.createdAt || gasto.fecha);
  const ahora = new Date();
  return subido.getFullYear() === ahora.getFullYear() && subido.getMonth() === ahora.getMonth();
}

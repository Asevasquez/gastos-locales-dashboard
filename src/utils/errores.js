// Mensaje para el usuario cuando falla el inicio de sesión. Distingue las causas para que se sepa qué hacer:
// datos incorrectos, sin conexión o problema del servidor.
export function describirErrorLogin(err) {
  const respuesta = err && err.response;
  if (!respuesta) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  if (respuesta.status === 401) {
    return 'Email o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.';
  }
  if (respuesta.status >= 500) {
    return 'El servidor tuvo un problema. Inténtalo de nuevo en un momento.';
  }
  return (respuesta.data && respuesta.data.error) || 'No se pudo iniciar sesión.';
}

// Mensaje para el usuario cuando falla una acción (guardar, cargar el catálogo…): distingue sin conexión, tiempo
// agotado, problema del servidor y el mensaje que responde el servidor.
export function describirError(err) {
  const respuesta = err && err.response;
  if (!respuesta) {
    if (err && (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || ''))) {
      return 'El servidor tardó demasiado en responder. Revisa tu conexión e inténtalo de nuevo.';
    }
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  if (respuesta.status >= 500) return 'El servidor tuvo un problema. Inténtalo de nuevo en un momento.';
  return (respuesta.data && respuesta.data.error) || 'No se pudo completar la acción.';
}

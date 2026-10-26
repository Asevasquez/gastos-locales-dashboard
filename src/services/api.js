import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

export const MENSAJE_SESION_VENCIDA = 'Tu sesión venció. Inicia sesión de nuevo.';
const CLAVE_MENSAJE = 'mensajeSesion';

// Cómo se lleva al usuario a la pantalla de inicio de sesión. Se puede reemplazar (lo hacen las pruebas).
let irAlLogin = () => {
  window.location.href = '/login';
};
export function configurarRedireccionLogin(funcion) {
  irAlLogin = funcion;
}

// El aviso de "tu sesión venció" sobrevive a la recarga de la página: se guarda y el login lo lee una sola vez.
export function leerMensajeSesion() {
  try {
    const mensaje = sessionStorage.getItem(CLAVE_MENSAJE);
    if (mensaje) sessionStorage.removeItem(CLAVE_MENSAJE);
    return mensaje;
  } catch (err) {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Un 401 en el INICIO DE SESIÓN significa "email o contraseña incorrectos", no "sesión vencida". Si se tratara
    // como vencida, la página se recargaba y el mensaje de error desaparecía antes de poder leerse.
    const esInicioDeSesion = String(err.config?.url || '').includes('/auth/login');

    if (err.response?.status === 401 && !esInicioDeSesion) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      // Si ya está en el login no se redirige (evita recargas en bucle).
      if (window.location.pathname !== '/login') {
        try {
          sessionStorage.setItem(CLAVE_MENSAJE, MENSAJE_SESION_VENCIDA);
        } catch (e) {
          // sin sessionStorage: se redirige igual, solo que sin el aviso
        }
        irAlLogin();
      }
    }
    return Promise.reject(err);
  }
);

export default api;

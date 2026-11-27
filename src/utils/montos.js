// Montos en pesos chilenos: siempre enteros. En pantalla se escriben con el separador de miles (5.543) sin que la persona
// tenga que poner los puntos; lo que se guarda y se envía es el número entero (5543).
const MAX_DIGITOS = 9; // hasta 999.999.999

// Deja solo los dígitos de lo que se escribió (sin puntos, comas ni letras) y quita los ceros del comienzo.
export function soloDigitos(texto) {
  return String(texto == null ? '' : texto).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITOS);
}

// "5543" → "5.543"
export function formatearMiles(digitos) {
  return String(digitos == null ? '' : digitos).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

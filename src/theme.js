import { createTheme } from '@mui/material/styles';

// Misma paleta que el mockup y que la app: rojo Kamver/KAMI como acento, fondo
// cálido neutro. Mantiene el dashboard, la app y el mockup visualmente consistentes.
const tema = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#F20000' },
    background: { default: '#F6F4F0', paper: '#FFFFFF' },
    text: { primary: '#1F1B16', secondary: '#8A8476' }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif'
    ].join(',')
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { border: '1px solid #EAE6DF', boxShadow: 'none' }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 }
      }
    }
  }
});

export default tema;

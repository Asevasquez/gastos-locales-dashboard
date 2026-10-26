import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { leerMensajeSesion } from '../services/api';
import { describirErrorLogin } from '../utils/errores';

export default function LoginPage() {
  const { login } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  // Si el usuario llegó acá porque su sesión venció, se le explica (se lee una sola vez).
  const [aviso] = useState(() => leerMensajeSesion());

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresa tu email y tu contraseña.');
      return;
    }
    setCargando(true);
    try {
      await login(email.trim(), password);
      navegar('/gastos');
    } catch (err) {
      setError(describirErrorLogin(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Paper sx={{ p: 4, width: 360, borderRadius: 4 }}>
        <Box
          component="img"
          src="/logo.png"
          alt="Kami Sushi"
          sx={{ width: 56, height: 56, borderRadius: 2, mb: 2 }}
        />
        <Typography variant="h6" fontWeight={700}>
          Gastos de Locales
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Ingresa con tu cuenta
        </Typography>

        <form onSubmit={manejarSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            autoComplete="username"
          />
          <TextField
            label="Contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            autoComplete="current-password"
          />

          {aviso && !error && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {aviso}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 3, py: 1.3 }}
            disabled={cargando}
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

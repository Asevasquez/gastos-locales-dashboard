import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import PlaceIcon from '@mui/icons-material/Place';
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  asignarLocales,
  eliminarUsuario
} from '../services/usuarios';
import { listarLocales } from '../services/locales';
import SelectorLocales from '../components/SelectorLocales';

const ROLES = ['MASTER', 'ADMINISTRADOR', 'ANALISTA'];
// localesAsignados es siempre un array de ids (strings), no de objetos.
const FORM_VACIO = { nombre: '', email: '', password: '', rol: 'ADMINISTRADOR', localesAsignados: [] };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null); // usuario en edición, o null = creando
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');

  const [editandoLocalesDe, setEditandoLocalesDe] = useState(null);
  const [seleccionLocales, setSeleccionLocales] = useState([]); // ids
  const [guardandoLocales, setGuardandoLocales] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const [u, l] = await Promise.all([listarUsuarios(), listarLocales()]);
    setUsuarios(u);
    setLocales(l);
  }

  function abrirCreacion() {
    setEditando(null);
    setForm(FORM_VACIO);
    setError('');
    setAbierto(true);
  }

  function abrirEdicion(usuario) {
    setEditando(usuario);
    setForm({
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      rol: usuario.rol,
      localesAsignados: []
    });
    setError('');
    setAbierto(true);
  }

  async function guardar() {
    setError('');
    try {
      if (editando) {
        const payload = { nombre: form.nombre, email: form.email, rol: form.rol, activo: true };
        if (form.password) payload.password = form.password;
        await actualizarUsuario(editando._id, payload);
      } else {
        await crearUsuario(form);
      }
      setAbierto(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el usuario');
    }
  }

  async function desactivar(usuario) {
    if (!window.confirm(`¿Desactivar a "${usuario.nombre}"? No podrá volver a iniciar sesión.`)) return;
    await eliminarUsuario(usuario._id);
    cargar();
  }

  function abrirAsignacion(usuario) {
    // Solo se precargan los locales que siguen activos (los que aparecen en el selector);
    // si el usuario tenía asignado uno ya desactivado, se descarta al guardar.
    const idsActivos = new Set(locales.map((l) => l._id));
    setSeleccionLocales((usuario.localesAsignados || []).map((l) => l._id).filter((id) => idsActivos.has(id)));
    setEditandoLocalesDe(usuario);
  }

  async function guardarLocalesAsignados() {
    setGuardandoLocales(true);
    try {
      await asignarLocales(editandoLocalesDe._id, seleccionLocales);
      setEditandoLocalesDe(null);
      cargar();
    } finally {
      setGuardandoLocales(false);
    }
  }

  // Texto compacto para la tabla: "Todos (N)" si tiene todos los locales activos,
  // los nombres si son pocos, o los primeros 3 + "+N más".
  function resumenLocales(usuario) {
    if (usuario.rol === 'MASTER') return 'Todos';
    const asignados = usuario.localesAsignados || [];
    if (asignados.length === 0) return '—';
    if (locales.length > 0 && asignados.length >= locales.length) return `Todos (${asignados.length})`;
    const nombres = asignados.map((l) => l.nombre);
    if (nombres.length <= 3) return nombres.join(', ');
    return `${nombres.slice(0, 3).join(', ')} +${nombres.length - 3} más`;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Usuarios
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCreacion}>
          Nuevo usuario
        </Button>
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Locales asignados</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u._id}>
                <TableCell>{u.nombre}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip size="small" label={u.rol} />
                </TableCell>
                <TableCell title={(u.localesAsignados || []).map((l) => l.nombre).join(', ')}>
                  {resumenLocales(u)}
                </TableCell>
                <TableCell align="right">
                  {u.rol !== 'MASTER' && (
                    <IconButton size="small" onClick={() => abrirAsignacion(u)}>
                      <PlaceIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => abrirEdicion(u)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => desactivar(u)}>
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Sin usuarios activos todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Crear / editar usuario */}
      <Dialog open={abierto} onClose={() => setAbierto(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editando ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            fullWidth
            sx={{ mt: 1 }}
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            fullWidth
          />
          <TextField
            label={editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            fullWidth
          />
          <TextField
            select
            label="Rol"
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
            fullWidth
          >
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>

          {!editando && form.rol !== 'MASTER' && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                Locales asignados
              </Typography>
              <SelectorLocales
                locales={locales}
                seleccionados={form.localesAsignados}
                onChange={(ids) => setForm({ ...form, localesAsignados: ids })}
              />
            </Box>
          )}
          {editando && form.rol !== 'MASTER' && (
            <Typography variant="caption" color="text.secondary">
              Los locales asignados se editan desde el ícono de ubicación en la tabla.
            </Typography>
          )}
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={guardar}
            disabled={!form.nombre || !form.email || (!editando && !form.password)}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Asignar locales a un usuario existente */}
      <Dialog open={!!editandoLocalesDe} onClose={() => setEditandoLocalesDe(null)} fullWidth maxWidth="sm">
        <DialogTitle>Locales de {editandoLocalesDe?.nombre}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <SelectorLocales
            locales={locales}
            seleccionados={seleccionLocales}
            onChange={setSeleccionLocales}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditandoLocalesDe(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarLocalesAsignados} disabled={guardandoLocales}>
            {guardandoLocales ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

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
import { listarLocales, crearLocal, actualizarLocal, eliminarLocal } from '../services/locales';

const MARCAS = ['KAMI_SUSHI', 'LATIN_PIZZA', 'KELVER'];
const FORM_VACIO = { nombre: '', marca: 'KAMI_SUSHI', direccion: '', codigoExterno: '' };

export default function LocalesPage() {
  const [locales, setLocales] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null); // local en edición, o null = creando
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLocales(await listarLocales());
  }

  function abrirCreacion() {
    setEditando(null);
    setForm(FORM_VACIO);
    setError('');
    setAbierto(true);
  }

  function abrirEdicion(local) {
    setEditando(local);
    setForm({
      nombre: local.nombre,
      marca: local.marca,
      direccion: local.direccion || '',
      codigoExterno: local.codigoExterno || ''
    });
    setError('');
    setAbierto(true);
  }

  async function guardar() {
    setError('');
    try {
      if (editando) {
        await actualizarLocal(editando._id, form);
      } else {
        await crearLocal(form);
      }
      setAbierto(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el local');
    }
  }

  async function desactivar(local) {
    if (!window.confirm(`¿Desactivar "${local.nombre}"? Dejará de verse en los selectores.`)) return;
    await eliminarLocal(local._id);
    cargar();
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Locales
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCreacion}>
          Nuevo local
        </Button>
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Código externo</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {locales.map((l) => (
              <TableRow key={l._id}>
                <TableCell>{l.nombre}</TableCell>
                <TableCell>
                  <Chip size="small" label={l.marca.replace('_', ' ')} />
                </TableCell>
                <TableCell>{l.direccion || '—'}</TableCell>
                <TableCell>{l.codigoExterno || '—'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => abrirEdicion(l)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => desactivar(l)}>
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {locales.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Sin locales activos todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={abierto} onClose={() => setAbierto(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editando ? 'Editar local' : 'Nuevo local'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            fullWidth
          />
          <TextField
            select
            label="Marca"
            value={form.marca}
            onChange={(e) => setForm({ ...form, marca: e.target.value })}
            fullWidth
          >
            {MARCAS.map((m) => (
              <MenuItem key={m} value={m}>
                {m.replace('_', ' ')}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            fullWidth
          />
          <TextField
            label="Código externo (opcional)"
            value={form.codigoExterno}
            onChange={(e) => setForm({ ...form, codigoExterno: e.target.value })}
            fullWidth
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={!form.nombre}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

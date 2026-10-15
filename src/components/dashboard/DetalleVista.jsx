import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Chip, IconButton, InputAdornment, Table, TableBody, TableCell, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { listarGastos, eliminarGasto } from '../../services/gastos';
import { COLOR, COLOR_MEDIO_PAGO, ETIQUETA_MEDIO_PAGO, Cargando, Tarjeta, clp, humanizar } from './comunes';
import { formatearFechaGasto } from '../../utils/fechas';

// Tabla de gastos (pura: recibe los gastos ya cargados). Búsqueda y paginación en el navegador.
export function DetalleTabla({ gastos, esMaster, onVerBoleta, onEliminar }) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(25);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return gastos;
    return gastos.filter((g) =>
      [g.local?.nombre, g.productoNombre, g.motivo, g.cuentaContable, g.categoria, g.usuario?.nombre]
        .some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [gastos, busqueda]);

  const visibles = filtrados.slice(pagina * porPagina, pagina * porPagina + porPagina);
  const total = filtrados.reduce((a, g) => a + g.monto, 0);

  return (
    <Tarjeta
      titulo="Detalle de gastos"
      subtitulo={`${filtrados.length} ${filtrados.length === 1 ? 'gasto' : 'gastos'} · ${clp(total)}`}
      derecha={
        <TextField
          size="small"
          placeholder="Buscar por local, ítem, motivo…"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }}
          sx={{ width: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      }
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1150 }}>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Cuenta contable</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Medio de pago</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell>Registró</TableCell>
              <TableCell align="center">Boleta</TableCell>
              {esMaster && <TableCell align="center">Eliminar</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((g) => (
              <TableRow key={g._id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatearFechaGasto(g.fecha)}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{g.local?.nombre}</TableCell>
                <TableCell>
                  {g.productoNombre}
                  <Typography sx={{ fontSize: 11, color: COLOR.muted }}>{g.cantidad} {String(g.unidadMedida).toLowerCase()}</Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={humanizar(g.categoria)} sx={{ bgcolor: '#F1EDE5', color: '#4A4238', fontWeight: 700, fontSize: 11 }} />
                </TableCell>
                <TableCell sx={{ color: COLOR.muted }}>{humanizar(g.cuentaContable)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{clp(g.monto)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={ETIQUETA_MEDIO_PAGO[g.medioPago] || g.medioPago}
                    sx={{ bgcolor: COLOR_MEDIO_PAGO[g.medioPago]?.bg, color: COLOR_MEDIO_PAGO[g.medioPago]?.color, fontWeight: 700, fontSize: 11 }}
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 240 }}>
                  <Tooltip title={g.motivo || ''}>
                    <Typography noWrap sx={{ fontSize: 13 }}>{g.motivo}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ color: COLOR.muted, whiteSpace: 'nowrap' }}>{g.usuario?.nombre}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onVerBoleta(g.fotoBoletaUrl)} disabled={!g.fotoBoletaUrl} aria-label="Ver boleta">
                    <ReceiptIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                {esMaster && (
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => onEliminar(g)} aria-label="Eliminar gasto">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={esMaster ? 11 : 10} align="center" sx={{ color: COLOR.muted, py: 4 }}>
                  No hay gastos que coincidan en este período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <TablePagination
        component="div"
        count={filtrados.length}
        page={pagina}
        onPageChange={(e, p) => setPagina(p)}
        rowsPerPage={porPagina}
        onRowsPerPageChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(0); }}
        rowsPerPageOptions={[25, 50, 100]}
        labelRowsPerPage="Filas por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
    </Tarjeta>
  );
}

// Carga los gastos del período y filtros activos y maneja el borrado (solo MASTER).
export default function DetalleVista({ parametros, esMaster, onVerBoleta, version = 0, onCambio }) {
  const [gastos, setGastos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setError('');
    listarGastos(parametros)
      .then((d) => { if (!cancelado) setGastos(d); })
      .catch((e) => { if (!cancelado) setError(e.response?.data?.error || 'No se pudieron cargar los gastos'); });
    return () => { cancelado = true; };
  }, [parametros, version]);

  async function eliminar(g) {
    const ok = window.confirm(`¿Eliminar el gasto de "${g.productoNombre}" por ${clp(g.monto)}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await eliminarGasto(g._id);
      if (onCambio) onCambio();
    } catch (e) {
      window.alert(e.response?.data?.error || 'No se pudo eliminar el gasto');
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!gastos) return <Cargando />;
  return <DetalleTabla gastos={gastos} esMaster={esMaster} onVerBoleta={onVerBoleta} onEliminar={eliminar} />;
}

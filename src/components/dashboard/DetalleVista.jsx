import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment,
  Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { listarGastos, eliminarGasto } from '../../services/gastos';
import { COLOR, COLOR_MEDIO_PAGO, ETIQUETA_MEDIO_PAGO, Cargando, Tarjeta, clp, humanizar } from './comunes';
import { formatearFechaGasto } from '../../utils/fechas';
import { puedeEliminarGasto } from '../../utils/permisos';
import { SIN_REPETIDOS, claveRepetido, detectarRepetidos } from '../../utils/duplicados';

const MOTIVO_MIN = 3;

// Confirmación de eliminación: pide un motivo obligatorio, que queda en el historial.
export function DialogEliminarGasto({ gasto, onCancelar, onConfirmar, enviando = false, error = '' }) {
  const [motivo, setMotivo] = useState('');
  const valido = motivo.trim().length >= MOTIVO_MIN;
  return (
    <Dialog open={!!gasto} onClose={enviando ? undefined : onCancelar} maxWidth="xs" fullWidth>
      <DialogTitle>Eliminar gasto</DialogTitle>
      <DialogContent>
        {gasto && (
          <>
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5, mb: 2 }}>
              <Typography fontWeight={700} fontSize={14}>{gasto.productoNombre} · {clp(gasto.monto)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {gasto.local?.nombre} · {formatearFechaGasto(gasto.fecha)}
              </Typography>
            </Box>
            <TextField
              autoFocus
              multiline
              minRows={2}
              fullWidth
              label="Motivo de la eliminación"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              helperText="Obligatorio. Quedará registrado en el historial con tu nombre y la fecha."
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancelar} disabled={enviando}>Cancelar</Button>
        <Button color="error" variant="contained" disabled={!valido || enviando} onClick={() => onConfirmar(motivo.trim())}>
          {enviando ? 'Eliminando…' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Tabla de gastos (pura: recibe los gastos ya cargados). Búsqueda y paginación en el navegador.
// `puedeEliminar(gasto)` decide si se muestra el botón de eliminar, al lado de la boleta.
export function DetalleTabla({ gastos, puedeEliminar, onVerBoleta, onEliminar, repetidos = SIN_REPETIDOS }) {
  const [soloRepetidos, setSoloRepetidos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(25);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let lista = gastos;
    if (soloRepetidos) {
      // los repetidos quedan agrupados (los idénticos juntos, el más antiguo primero)
      lista = gastos
        .filter((g) => repetidos.porId.has(g._id))
        .sort((a, b) => claveRepetido(a).localeCompare(claveRepetido(b)) || new Date(a.createdAt) - new Date(b.createdAt));
    }
    if (!q) return lista;
    return lista.filter((g) =>
      [g.local?.nombre, g.productoNombre, g.motivo, g.cuentaContable, g.categoria, g.usuario?.nombre, g.folio]
        .some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [gastos, busqueda, soloRepetidos, repetidos]);

  // Cuántos productos tiene cada documento (boleta o factura), según los gastos cargados.
  const productosPorDocumento = useMemo(() => {
    const m = new Map();
    for (const g of gastos) if (g.documentoId) m.set(g.documentoId, (m.get(g.documentoId) || 0) + 1);
    return m;
  }, [gastos]);

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
      {repetidos.grupos > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => { setSoloRepetidos((v) => !v); setPagina(0); }}>
              {soloRepetidos ? 'Ver todos' : `Ver solo repetidos (${repetidos.filas})`}
            </Button>
          }
        >
          {repetidos.filas} gastos parecen repetidos ({repetidos.grupos} {repetidos.grupos === 1 ? 'grupo' : 'grupos'} de gastos idénticos):
          {' '}{repetidos.sobrantes === 1 ? 'sobraría 1' : `sobrarían ${repetidos.sobrantes}`}, por {clp(repetidos.montoSobrante)}. Revísalos y elimina los que sobren.
        </Alert>
      )}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1250 }}>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Folio</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Cuenta contable</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Medio de pago</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell>Registró</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((g) => (
              <TableRow key={g._id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatearFechaGasto(g.fecha)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {g.folio || <Box component="span" sx={{ color: COLOR.muted }}>—</Box>}
                  {productosPorDocumento.get(g.documentoId) > 1 && (
                    <Typography sx={{ fontSize: 11, color: COLOR.muted }}>
                      Documento de {productosPorDocumento.get(g.documentoId)} productos
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{g.local?.nombre}</TableCell>
                <TableCell>
                  {g.productoNombre}
                  <Typography sx={{ fontSize: 11, color: COLOR.muted }}>{g.cantidad} {String(g.unidadMedida).toLowerCase()}</Typography>
                  {repetidos.porId.has(g._id) && (
                    <Chip
                      size="small"
                      label={`Repetido ×${repetidos.porId.get(g._id).veces}`}
                      sx={{ mt: 0.5, bgcolor: '#FCF1E8', color: '#7A4A22', fontWeight: 700, fontSize: 10, height: 20 }}
                    />
                  )}
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
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton size="small" onClick={() => onVerBoleta(g.fotoBoletaUrl)} disabled={!g.fotoBoletaUrl} aria-label="Ver boleta">
                    <ReceiptIcon fontSize="small" />
                  </IconButton>
                  {puedeEliminar(g) && (
                    <Tooltip title="Eliminar gasto">
                      <IconButton size="small" color="error" onClick={() => onEliminar(g)} aria-label="Eliminar gasto">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ color: COLOR.muted, py: 4 }}>
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

// Carga los gastos del período y filtros activos y maneja la eliminación (con motivo obligatorio).
export default function DetalleVista({ parametros, usuario, onVerBoleta, version = 0, onCambio }) {
  const [gastos, setGastos] = useState(null);
  const [error, setError] = useState('');
  const [aEliminar, setAEliminar] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  useEffect(() => {
    let cancelado = false;
    setError('');
    listarGastos(parametros)
      .then((d) => { if (!cancelado) setGastos(d); })
      .catch((e) => { if (!cancelado) setError(e.response?.data?.error || 'No se pudieron cargar los gastos'); });
    return () => { cancelado = true; };
  }, [parametros, version]);

  function abrirEliminar(g) {
    setErrorEliminar('');
    setAEliminar(g);
  }

  async function confirmarEliminar(motivo) {
    setEnviando(true);
    setErrorEliminar('');
    try {
      await eliminarGasto(aEliminar._id, motivo);
      setAEliminar(null);
      if (onCambio) onCambio();
    } catch (e) {
      setErrorEliminar(e.response?.data?.error || 'No se pudo eliminar el gasto');
    } finally {
      setEnviando(false);
    }
  }

  const repetidos = useMemo(() => (gastos ? detectarRepetidos(gastos) : SIN_REPETIDOS), [gastos]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!gastos) return <Cargando />;
  return (
    <>
      <DetalleTabla
        gastos={gastos}
        repetidos={repetidos}
        puedeEliminar={(g) => puedeEliminarGasto(usuario, g)}
        onVerBoleta={onVerBoleta}
        onEliminar={abrirEliminar}
      />
      <DialogEliminarGasto
        key={aEliminar ? aEliminar._id : 'cerrado'}
        gasto={aEliminar}
        enviando={enviando}
        error={errorEliminar}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={confirmarEliminar}
      />
    </>
  );
}

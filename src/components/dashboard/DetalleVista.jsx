import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment,
  MenuItem, Select, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ReplayIcon from '@mui/icons-material/Replay';
import { listarGastos, eliminarGasto } from '../../services/gastos';
import { reabrirBoletas } from '../../services/revision';
import { describirError } from '../../utils/errores';
import { COLOR, COLOR_MEDIO_PAGO, ETIQUETA_MEDIO_PAGO, Cargando, ChipEstado, Tarjeta, clp, humanizar } from './comunes';
import { formatearFechaGasto } from '../../utils/fechas';
import { fotosDe } from '../../utils/fotos';
import { puedeEliminarGasto } from '../../utils/permisos';
import { FILTROS_ESTADO, claveBoleta, coincideEstado, estadoDe, puedeCorregirBoleta, puedeReabrir } from '../../utils/revision';
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
// `puedeEliminar(gasto)` decide si se muestra el botón de eliminar, al lado de la boleta; `puedeCorregir(gasto)` y
// `puedeReabrir(gasto)`, los de corregir una boleta rechazada y reabrir su revisión.
// El filtro de estado empieza en "Vigentes": no muestra los rechazados, igual que los totales.
export function DetalleTabla({
  gastos, puedeEliminar, onVerBoleta, onEliminar, repetidos = SIN_REPETIDOS,
  puedeCorregir = () => false, onCorregir = () => {}, puedeReabrir: puedeReabrirGasto = () => false, onReabrir = () => {}
}) {
  const [estadoFiltro, setEstadoFiltro] = useState('VIGENTES');
  const [soloRepetidos, setSoloRepetidos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(25);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let lista = gastos.filter((g) => coincideEstado(estadoFiltro, g));
    if (soloRepetidos) {
      // los repetidos quedan agrupados (los idénticos juntos, el más antiguo primero)
      lista = lista
        .filter((g) => repetidos.porId.has(g._id))
        .sort((a, b) => claveRepetido(a).localeCompare(claveRepetido(b)) || new Date(a.createdAt) - new Date(b.createdAt));
    }
    if (!q) return lista;
    return lista.filter((g) =>
      [g.local?.nombre, g.productoNombre, g.motivo, g.cuentaContable, g.categoria, g.usuario?.nombre, g.folio, g.numeroDocumento]
        .some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [gastos, busqueda, soloRepetidos, repetidos, estadoFiltro]);

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
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Select
            size="small"
            value={estadoFiltro}
            onChange={(e) => { setEstadoFiltro(e.target.value); setPagina(0); }}
            inputProps={{ 'aria-label': 'Estado' }}
            sx={{ minWidth: 150 }}
          >
            {FILTROS_ESTADO.map((f) => <MenuItem key={f.valor} value={f.valor}>Estado: {f.etiqueta.toLowerCase()}</MenuItem>)}
          </Select>
          <TextField
            size="small"
            placeholder="Buscar por local, ítem, motivo…"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }}
            sx={{ width: 280 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
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
        <Table size="small" sx={{ minWidth: 1480 }}>
          <TableHead>
            <TableRow>
              <TableCell>N°</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Folio</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Cuenta contable</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Medio de pago</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell>Registró</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((g) => (
              <TableRow key={g._id} hover>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{g.numeroDocumento ?? '—'}</TableCell>
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
                <TableCell sx={{ maxWidth: 200 }}>
                  <ChipEstado estado={g.estado} />
                  {estadoDe(g) === 'RECHAZADO' && g.motivoRechazo && (
                    <Tooltip title={g.motivoRechazo}>
                      <Typography noWrap sx={{ fontSize: 11, color: COLOR.rojo, mt: 0.5 }}>{g.motivoRechazo}</Typography>
                    </Tooltip>
                  )}
                  {estadoDe(g) !== 'PENDIENTE' && g.revisadoPor?.nombre && (
                    <Typography sx={{ fontSize: 11, color: COLOR.muted }}>por {g.revisadoPor.nombre}</Typography>
                  )}
                  {estadoDe(g) === 'PENDIENTE' && g.rechazoAnterior?.motivo && (
                    <Tooltip title={`Se rechazó por: ${g.rechazoAnterior.motivo}`}>
                      <Typography sx={{ fontSize: 11, color: COLOR.ambar }}>Corregida tras un rechazo</Typography>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 240 }}>
                  <Tooltip title={g.motivo || ''}>
                    <Typography noWrap sx={{ fontSize: 13 }}>{g.motivo}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ color: COLOR.muted, whiteSpace: 'nowrap' }}>{g.usuario?.nombre}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton size="small" onClick={() => onVerBoleta(fotosDe(g))} disabled={fotosDe(g).length === 0} aria-label="Ver boleta">
                    <Badge badgeContent={fotosDe(g).length} invisible={fotosDe(g).length < 2} color="primary" title={`${fotosDe(g).length} fotos`}>
                      <ReceiptIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                  {puedeCorregir(g) && (
                    <Tooltip title="Corregir la boleta rechazada">
                      <IconButton size="small" color="primary" onClick={() => onCorregir(g)} aria-label="Corregir boleta">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {puedeReabrirGasto(g) && (
                    <Tooltip title="Reabrir la revisión (vuelve a pendiente)">
                      <IconButton size="small" onClick={() => onReabrir(g)} aria-label="Reabrir revisión">
                        <ReplayIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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
                <TableCell colSpan={13} align="center" sx={{ color: COLOR.muted, py: 4 }}>
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

// Confirmación de reabrir la revisión: la boleta vuelve a "pendiente" para que se revise de nuevo. El motivo es opcional.
export function DialogReabrir({ gasto, onCancelar, onConfirmar, enviando = false, error = '' }) {
  const [motivo, setMotivo] = useState('');
  return (
    <Dialog open={!!gasto} onClose={enviando ? undefined : onCancelar} maxWidth="xs" fullWidth>
      <DialogTitle>Reabrir revisión</DialogTitle>
      <DialogContent>
        {gasto && (
          <>
            <Typography sx={{ mb: 2, fontSize: 14 }}>
              La boleta{gasto.numeroDocumento != null ? ` N° ${gasto.numeroDocumento}` : ''} ({gasto.local?.nombre}) volverá a quedar
              pendiente y habrá que revisarla de nuevo. Quedará registrado en el historial.
            </Typography>
            <TextField
              fullWidth
              label="Motivo (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              helperText="Por ejemplo: «Aprobé la boleta equivocada»."
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancelar} disabled={enviando}>Cancelar</Button>
        <Button variant="contained" disabled={enviando} onClick={() => onConfirmar(motivo.trim())}>
          {enviando ? 'Reabriendo…' : 'Reabrir revisión'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Carga los gastos del período y filtros activos y maneja la eliminación (con motivo obligatorio), corregir y reabrir.
export default function DetalleVista({ parametros, usuario, onVerBoleta, version = 0, onCambio }) {
  const navegar = useNavigate();
  const [aReabrir, setAReabrir] = useState(null);
  const [errorReabrir, setErrorReabrir] = useState('');
  const [reabriendo, setReabriendo] = useState(false);
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

  async function confirmarReabrir(motivo) {
    setReabriendo(true);
    setErrorReabrir('');
    try {
      const r = await reabrirBoletas({ documentos: [claveBoleta(aReabrir)], motivo });
      if (r.documentos === 0) {
        setErrorReabrir((r.omitidos && r.omitidos[0] && r.omitidos[0].error) || 'No se pudo reabrir la revisión');
        return;
      }
      setAReabrir(null);
      if (onCambio) onCambio();
    } catch (e) {
      setErrorReabrir(describirError(e));
    } finally {
      setReabriendo(false);
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
        puedeCorregir={(g) => puedeCorregirBoleta(usuario, g)}
        onCorregir={(g) => navegar(`/gastos/${encodeURIComponent(claveBoleta(g))}/corregir`)}
        puedeReabrir={(g) => puedeReabrir(usuario, g)}
        onReabrir={(g) => { setErrorReabrir(''); setAReabrir(g); }}
        onVerBoleta={onVerBoleta}
        onEliminar={abrirEliminar}
      />
      <DialogReabrir
        key={aReabrir ? aReabrir._id : 'cerrado-reabrir'}
        gasto={aReabrir}
        enviando={reabriendo}
        error={errorReabrir}
        onCancelar={() => setAReabrir(null)}
        onConfirmar={confirmarReabrir}
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

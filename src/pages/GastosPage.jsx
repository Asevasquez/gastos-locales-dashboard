import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  MenuItem,
  Select,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
  Chip,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import * as XLSX from 'xlsx';
import { listarGastos, obtenerResumen, obtenerPorCuentaContable, eliminarGasto } from '../services/gastos';
import { listarLocales } from '../services/locales';
import { useAuth } from '../context/AuthContext';

function mesActual() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
}

function opcionesMeses() {
  const opciones = [];
  const base = new Date();
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const etiqueta = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    opciones.push({ valor, etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1) });
  }
  return opciones;
}

// A partir de cualquier día, calcula el lunes y el domingo de esa semana (convención CL).
function rangoSemana(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  const diaSemana = fecha.getDay(); // 0 = domingo
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + offsetLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const aISO = (d) => d.toISOString().slice(0, 10);
  return { desde: aISO(lunes), hasta: aISO(domingo) };
}

function formatearPesos(n) {
  return `$${Number(n || 0).toLocaleString('es-CL')}`;
}

function humanizar(texto) {
  if (!texto) return '';
  const limpio = String(texto).replace(/_/g, ' ').trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

const ETIQUETA_MEDIO_PAGO = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO_FLUJO: 'Efectivo flujo'
};
const COLOR_MEDIO_PAGO = {
  EFECTIVO: { color: '#3B7A57', bg: '#E1EFE6' },
  TRANSFERENCIA: { color: '#4E7BC1', bg: '#E4EBF8' },
  EFECTIVO_FLUJO: { color: '#8A6D3B', bg: '#F5EBDA' }
};

const COLORES_CATEGORIA = ['#F20000', '#4E7BC1', '#8A6D3B', '#3B7A57', '#6B6558'];

const MESES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

export default function GastosPage() {
  const { usuario } = useAuth();
  const [periodo, setPeriodo] = useState('mes'); // 'mes' | 'semana'
  const [mes, setMes] = useState(mesActual());
  const [diaDeLaSemana, setDiaDeLaSemana] = useState(new Date().toISOString().slice(0, 10));

  const [locales, setLocales] = useState([]);
  const [localesSeleccionados, setLocalesSeleccionados] = useState([]);
  const [medioPagoFiltro, setMedioPagoFiltro] = useState('');

  const [resumen, setResumen] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [porCuentaContable, setPorCuentaContable] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [boletaVisible, setBoletaVisible] = useState(null);

  useEffect(() => {
    listarLocales().then(setLocales);
  }, []);

  const parametrosPeriodo = useMemo(() => {
    if (periodo === 'semana') {
      const { desde, hasta } = rangoSemana(diaDeLaSemana);
      return { desde, hasta };
    }
    return { mes };
  }, [periodo, mes, diaDeLaSemana]);

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametrosPeriodo, localesSeleccionados, medioPagoFiltro]);

  async function cargarTodo() {
    setCargando(true);
    try {
      const idsLocales = localesSeleccionados.map((l) => l._id).join(',') || undefined;
      const params = {
        ...parametrosPeriodo,
        locales: idsLocales,
        medioPago: medioPagoFiltro || undefined
      };

      const [resumenData, gastosData, cuentaContableData] = await Promise.all([
        obtenerResumen(params),
        listarGastos(params),
        obtenerPorCuentaContable(params)
      ]);
      setResumen(resumenData);
      setGastos(gastosData);
      setPorCuentaContable(cuentaContableData.porCuentaContable || []);
    } finally {
      setCargando(false);
    }
  }

  async function manejarEliminarGasto(gasto) {
    const confirmado = window.confirm(
      `¿Eliminar el gasto de "${gasto.productoNombre}" por ${formatearPesos(gasto.monto)}? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    try {
      await eliminarGasto(gasto._id);
      cargarTodo();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo eliminar el gasto');
    }
  }

  const maxCategoria = useMemo(
    () => Math.max(1, ...(resumen?.porCategoria || []).map((c) => c.total)),
    [resumen]
  );
  const maxCuenta = useMemo(
    () => Math.max(1, ...porCuentaContable.map((c) => c.total)),
    [porCuentaContable]
  );

  function etiquetaPeriodo() {
    if (periodo === 'semana') {
      const { desde, hasta } = parametrosPeriodo;
      return `Semana del ${new Date(desde + 'T00:00:00').toLocaleDateString('es-CL')} al ${new Date(
        hasta + 'T00:00:00'
      ).toLocaleDateString('es-CL')}`;
    }
    return opcionesMeses().find((o) => o.valor === mes)?.etiqueta;
  }

  // Exporta en el formato de la planilla de referencia: FECHA, ITEM, DETALLE
  // (cantidad + unidad - motivo, ej. "5 KG - Se acabó el arroz"), MONTO, ESTATUS,
  // ESTE MES, ITEM (= cuenta contable en mayúsculas), RATIO, CUENTA CONTABLE, MES,
  // MEDIO DE PAGO. ESTATUS/ESTE MES quedan en blanco: no hay con qué llenarlas de
  // forma confiable desde el sistema.
  function exportarExcel() {
    const filas = gastos.map((g) => {
      const fecha = new Date(g.fecha);
      return {
        FECHA: fecha.toLocaleDateString('es-CL'),
        ITEM: g.productoNombre,
        DETALLE: `${g.cantidad} ${g.unidadMedida} - ${g.motivo}`,
        MONTO: g.monto,
        ESTATUS: '',
        'ESTE MES': '',
        ITEM_2: g.cuentaContable?.toUpperCase() || '',
        RATIO: g.categoria,
        'CUENTA CONTABLE': g.cuentaContable,
        MES: MESES_ES[fecha.getMonth()],
        'MEDIO DE PAGO': ETIQUETA_MEDIO_PAGO[g.medioPago] || g.medioPago
      };
    });

    const hoja = XLSX.utils.json_to_sheet(filas);
    // json_to_sheet no permite dos columnas "ITEM" con la misma clave — se renombra
    // la segunda acá para que el encabezado final quede igual al de la planilla.
    const rango = XLSX.utils.decode_range(hoja['!ref']);
    for (let col = rango.s.c; col <= rango.e.c; col += 1) {
      const celda = hoja[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (celda && celda.v === 'ITEM_2') celda.v = 'ITEM';
    }

    const libro = XLSX.utils.book_new();
    const nombreArchivo =
      periodo === 'semana'
        ? `gastos-semana-${parametrosPeriodo.desde}-al-${parametrosPeriodo.hasta}`
        : `gastos-${mes}`;
    XLSX.utils.book_append_sheet(libro, hoja, 'Gastos');
    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Gastos de locales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {etiquetaPeriodo()}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportarExcel}
          disabled={gastos.length === 0}
        >
          Exportar Excel
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={periodo}
          onChange={(e, val) => val && setPeriodo(val)}
          sx={{ bgcolor: 'background.paper' }}
        >
          <ToggleButton value="mes">Mes</ToggleButton>
          <ToggleButton value="semana">Semana</ToggleButton>
        </ToggleButtonGroup>

        {periodo === 'mes' ? (
          <Select size="small" value={mes} onChange={(e) => setMes(e.target.value)} sx={{ bgcolor: 'background.paper', minWidth: 180 }}>
            {opcionesMeses().map((o) => (
              <MenuItem key={o.valor} value={o.valor}>
                {o.etiqueta}
              </MenuItem>
            ))}
          </Select>
        ) : (
          <TextField
            size="small"
            type="date"
            value={diaDeLaSemana}
            onChange={(e) => setDiaDeLaSemana(e.target.value)}
            sx={{ bgcolor: 'background.paper' }}
            label="Cualquier día de la semana"
            InputLabelProps={{ shrink: true }}
          />
        )}

        <Autocomplete
          multiple
          size="small"
          options={locales}
          getOptionLabel={(l) => l.nombre}
          value={localesSeleccionados}
          onChange={(e, val) => setLocalesSeleccionados(val)}
          sx={{ minWidth: 240, bgcolor: 'background.paper' }}
          renderInput={(params) => (
            <TextField {...params} placeholder={localesSeleccionados.length ? '' : 'Todos los locales'} />
          )}
        />

        <Select
          size="small"
          displayEmpty
          value={medioPagoFiltro}
          onChange={(e) => setMedioPagoFiltro(e.target.value)}
          sx={{ bgcolor: 'background.paper', minWidth: 170 }}
        >
          <MenuItem value="">Medio de pago: todos</MenuItem>
          {Object.entries(ETIQUETA_MEDIO_PAGO).map(([valor, etiqueta]) => (
            <MenuItem key={valor} value={valor}>
              {etiqueta}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {cargando && <LinearProgress sx={{ mb: 3 }} />}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              TOTAL DEL PERÍODO
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {formatearPesos(resumen?.totalGastado)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              GASTOS REGISTRADOS
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {resumen?.totalGastos || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              LOCALES SIN REGISTRO
            </Typography>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {resumen?.localesSinRegistro?.length || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              CATEGORÍA CON MÁS GASTO
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {resumen?.porCategoria?.[0]?._id
                ? `${humanizar(resumen.porCategoria[0]._id)} · ${formatearPesos(resumen.porCategoria[0].total)}`
                : '—'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography fontWeight={700}>Últimos gastos</Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Local</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell>Cuenta contable</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell>Medio de pago</TableCell>
                    <TableCell align="center">Boleta</TableCell>
                    {usuario?.rol === 'MASTER' && <TableCell align="center">Eliminar</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gastos.slice(0, 10).map((g) => (
                    <TableRow key={g._id}>
                      <TableCell>{new Date(g.fecha).toLocaleDateString('es-CL')}</TableCell>
                      <TableCell>{g.local?.nombre}</TableCell>
                      <TableCell>{g.productoNombre}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={humanizar(g.categoria)}
                          sx={{ bgcolor: '#F1EDE5', color: '#4A4238', fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{humanizar(g.cuentaContable)}</TableCell>
                      <TableCell align="right">{formatearPesos(g.monto)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ETIQUETA_MEDIO_PAGO[g.medioPago] || g.medioPago}
                          sx={{
                            bgcolor: COLOR_MEDIO_PAGO[g.medioPago]?.bg,
                            color: COLOR_MEDIO_PAGO[g.medioPago]?.color,
                            fontWeight: 700,
                            fontSize: 11
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => setBoletaVisible(g.fotoBoletaUrl)}
                          disabled={!g.fotoBoletaUrl}
                        >
                          <ReceiptIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      {usuario?.rol === 'MASTER' && (
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => manejarEliminarGasto(g)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {gastos.length === 0 && !cargando && (
                    <TableRow>
                      <TableCell colSpan={usuario?.rol === 'MASTER' ? 9 : 8} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        Sin gastos registrados en este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
            {gastos.length > 10 && (
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  Mostrando 10 de {gastos.length} — usa "Exportar Excel" para ver todos.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight={700} mb={2}>
              Gasto por categoría
            </Typography>
            {(resumen?.porCategoria || []).map((c, i) => (
              <Box key={c._id} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, mb: 0.5 }}>
                  <span>{humanizar(c._id)}</span>
                  <strong>{formatearPesos(c.total)}</strong>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(c.total / maxCategoria) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: '#F1EDE5',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length],
                      borderRadius: 999
                    }
                  }}
                />
              </Box>
            ))}
            {(resumen?.porCategoria || []).length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sin datos para este período.
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={700} mb={1.5}>
              Locales sin registrar
            </Typography>
            {(resumen?.localesSinRegistro || []).map((l) => (
              <Box key={l._id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '999px', bgcolor: 'primary.main' }} />
                <Typography variant="body2">{l.nombre}</Typography>
              </Box>
            ))}
            {(resumen?.localesSinRegistro || []).length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Todos los locales ya registraron al menos un gasto.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography fontWeight={700}>Gasto por cuenta contable</Typography>
          <Typography variant="caption" color="text.secondary">
            Según la cuenta contable cargada en la planilla de ítems
          </Typography>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cuenta contable</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>% del período</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {porCuentaContable.slice(0, 8).map((c) => (
              <TableRow key={c.cuentaContable}>
                <TableCell>{humanizar(c.cuentaContable)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatearPesos(c.total)}
                </TableCell>
                <TableCell sx={{ width: 220 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(c.total / maxCuenta) * 100}
                      sx={{
                        flex: 1,
                        height: 7,
                        borderRadius: 999,
                        bgcolor: '#F1EDE5',
                        '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 999 }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ width: 40 }}>
                      {c.porcentaje}%
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {porCuentaContable.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  Sin gastos registrados en este período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!boletaVisible} onClose={() => setBoletaVisible(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Boleta / factura
          <IconButton size="small" onClick={() => setBoletaVisible(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {boletaVisible && (
            <Box
              component="img"
              src={boletaVisible}
              alt="Boleta o factura del gasto"
              sx={{ width: '100%', borderRadius: 2, display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

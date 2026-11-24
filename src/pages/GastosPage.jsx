import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Box, Button, LinearProgress, MenuItem, Select,
  Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { listarGastos } from '../services/gastos';
import { listarLocales } from '../services/locales';
import { obtenerResumenRevision } from '../services/revision';
import { claveBoleta, puedeRevisar, puedeSubirGastos } from '../utils/revision';
import { obtenerDashboardResumen, obtenerDashboardLocales, obtenerDashboardControl } from '../services/dashboard';
import { useAuth } from '../context/AuthContext';
import { exportarGastosExcel } from '../utils/exportarExcel';
import { diaMesLargo, fechaLocalISO, mesActual, opcionesMeses, rangoSemana } from '../utils/fechas';
import FiltroLocales from '../components/dashboard/FiltroLocales';
import ResumenVista from '../components/dashboard/ResumenVista';
import LocalesVista from '../components/dashboard/LocalesVista';
import ControlVista from '../components/dashboard/ControlVista';
import DetalleVista from '../components/dashboard/DetalleVista';
import VisorBoleta from '../components/dashboard/VisorBoleta';
import HistorialVista from '../components/dashboard/HistorialVista';
import RevisionVista from '../components/dashboard/RevisionVista';
import { Cargando, ETIQUETA_MEDIO_PAGO } from '../components/dashboard/comunes';

const SERVICIOS = { resumen: obtenerDashboardResumen, locales: obtenerDashboardLocales, control: obtenerDashboardControl };
const SIN_DATOS = { resumen: null, locales: null, control: null };
// Estas pestañas cargan sus propios datos (no usan el período ni el medio de pago).
const PROPIAS = ['detalle', 'historial', 'revision', 'corregir'];
const SIN_PERIODO = ['revision', 'corregir'];

export default function GastosPage() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [tab, setTab] = useState('resumen');
  const [avisos, setAvisos] = useState({ pendientes: 0, rechazadas: 0, porCorregir: 0 });
  const revisa = puedeRevisar(usuario);
  const sube = puedeSubirGastos(usuario);
  const [periodo, setPeriodo] = useState('mes'); // 'mes' | 'semana'
  const [mes, setMes] = useState(mesActual());
  const [diaSemana, setDiaSemana] = useState(fechaLocalISO(new Date()));
  const [locales, setLocales] = useState([]);
  const [seleccion, setSeleccion] = useState(null); // ids de locales, o null = todos
  const [medioPago, setMedioPago] = useState('');

  const [datos, setDatos] = useState(SIN_DATOS);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [boleta, setBoleta] = useState(null); // fotos de la boleta que se está viendo (lista de direcciones)
  // las vistas entregan la lista de fotos (de 1 a 3); también se acepta una dirección suelta
  const abrirBoleta = (fotos) => {
    const lista = Array.isArray(fotos) ? fotos : fotos ? [fotos] : [];
    setBoleta(lista.length > 0 ? lista : null);
  };
  const [exportando, setExportando] = useState(false);
  const [version, setVersion] = useState(0); // sube al borrar un gasto, para recalcular todo

  useEffect(() => {
    listarLocales().then(setLocales).catch(() => setLocales([]));
  }, []);

  // Contadores de las pestañas Revisión y Por corregir. Se recalculan cada vez que algo cambia (aprobar, rechazar, etc.).
  const refrescarAvisos = useCallback(() => {
    obtenerResumenRevision().then(setAvisos).catch(() => {});
  }, []);
  useEffect(() => { refrescarAvisos(); }, [refrescarAvisos, version]);

  // El backend limita siempre los locales a los permitidos del usuario; acá solo se pide el recorte.
  const parametros = useMemo(
    () => ({
      ...(periodo === 'semana' ? rangoSemana(diaSemana) : { mes }),
      locales: seleccion && seleccion.length ? seleccion.join(',') : undefined,
      medioPago: medioPago || undefined
    }),
    [periodo, mes, diaSemana, seleccion, medioPago]
  );

  // Al cambiar filtros se descartan los datos de todas las pestañas (para no mostrar cifras viejas).
  useEffect(() => {
    setDatos(SIN_DATOS);
  }, [parametros, version]);

  useEffect(() => {
    if (PROPIAS.includes(tab)) return undefined;
    let cancelado = false;
    setCargando(true);
    setError('');
    SERVICIOS[tab](parametros)
      .then((d) => { if (!cancelado) setDatos((prev) => ({ ...prev, [tab]: d })); })
      .catch((e) => { if (!cancelado) setError(e.response?.data?.error || 'No se pudieron cargar las estadísticas'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [tab, parametros, version]);

  function subtitulo() {
    if (periodo === 'semana') {
      return `Semana del ${diaMesLargo(parametros.desde)} al ${diaMesLargo(parametros.hasta)}`;
    }
    const opcion = opcionesMeses().find((o) => o.valor === mes);
    let texto = opcion ? opcion.etiqueta : mes;
    const info = (datos.resumen || datos.locales || datos.control)?.periodo;
    if (info && info.tipo === 'mes' && info.mes === mes && info.enCurso) {
      texto += ` · del 1 al ${info.dias} (período en curso)`;
    }
    return texto;
  }

  async function exportar() {
    setExportando(true);
    try {
      // lo rechazado no se exporta (no suma en los totales); la columna ESTADO distingue lo pendiente de lo aprobado
      const gastos = await listarGastos({ ...parametros, estado: 'PENDIENTE,APROBADO' });
      if (gastos.length === 0) {
        window.alert('No hay gastos para exportar con los filtros actuales.');
        return;
      }
      const nombre = periodo === 'semana' ? `gastos-semana-${parametros.desde}-al-${parametros.hasta}` : `gastos-${mes}`;
      exportarGastosExcel(gastos, nombre);
    } catch (e) {
      window.alert(e.response?.data?.error || 'No se pudo exportar');
    } finally {
      setExportando(false);
    }
  }

  const sinEstadisticas = PROPIAS.includes(tab); // estas pestañas cargan sus propios datos
  const sinPeriodo = SIN_PERIODO.includes(tab);
  const datosTab = sinEstadisticas ? null : datos[tab];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Gastos de locales</Typography>
          <Typography variant="body2" color="text.secondary">{subtitulo()}</Typography>
        </Box>
        {!sinPeriodo && (
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportar} disabled={exportando}>
            {exportando ? 'Exportando…' : 'Exportar Excel'}
          </Button>
        )}
      </Box>

      {/* Avisos: boletas rechazadas que hay que corregir (quien sube) y boletas esperando revisión (quien revisa) */}
      {sube && avisos.porCorregir > 0 && tab !== 'corregir' && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => setTab('corregir')}>Ver</Button>}>
          Tienes {avisos.porCorregir} {avisos.porCorregir === 1 ? 'boleta rechazada' : 'boletas rechazadas'} por corregir.
        </Alert>
      )}
      {revisa && avisos.pendientes > 0 && tab !== 'revision' && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => setTab('revision')}>Revisar</Button>}>
          Hay {avisos.pendientes} {avisos.pendientes === 1 ? 'boleta pendiente' : 'boletas pendientes'} de revisión.
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{ borderBottom: '1px solid #EAE6DF', mb: 2.5, '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 14, minWidth: 0, mr: 2 } }}
      >
        <Tab value="resumen" label="Resumen" />
        <Tab value="locales" label="Locales" />
        <Tab value="control" label="Control" />
        <Tab value="detalle" label="Detalle" />
        <Tab value="historial" label="Historial" />
        {revisa && (
          <Tab value="revision" label={<Badge badgeContent={avisos.pendientes} color="error" sx={{ '& .MuiBadge-badge': { right: -16 } }}>Revisión</Badge>} />
        )}
        {sube && (
          <Tab value="corregir" label={<Badge badgeContent={avisos.porCorregir} color="error" sx={{ '& .MuiBadge-badge': { right: -16 } }}>Por corregir</Badge>} />
        )}
      </Tabs>

      <Box sx={{ mb: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {!sinPeriodo && (
        <ToggleButtonGroup size="small" exclusive value={periodo} onChange={(e, v) => v && setPeriodo(v)} sx={{ bgcolor: 'background.paper' }}>
          <ToggleButton value="mes">Mes</ToggleButton>
          <ToggleButton value="semana">Semana</ToggleButton>
        </ToggleButtonGroup>
        )}

        {sinPeriodo ? null : periodo === 'mes' ? (
          <Select size="small" value={mes} onChange={(e) => setMes(e.target.value)} sx={{ bgcolor: 'background.paper', minWidth: 190 }}>
            {opcionesMeses().map((o) => <MenuItem key={o.valor} value={o.valor}>{o.etiqueta}</MenuItem>)}
          </Select>
        ) : (
          <TextField
            size="small"
            type="date"
            label="Cualquier día de la semana"
            value={diaSemana}
            onChange={(e) => e.target.value && setDiaSemana(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ bgcolor: 'background.paper' }}
          />
        )}

        <FiltroLocales locales={locales} seleccion={seleccion} onAplicar={setSeleccion} />

        {!sinPeriodo && (
        <Select
          size="small"
          displayEmpty
          value={medioPago}
          onChange={(e) => setMedioPago(e.target.value)}
          sx={{ bgcolor: 'background.paper', minWidth: 190 }}
        >
          <MenuItem value="">Medio de pago: todos</MenuItem>
          {Object.entries(ETIQUETA_MEDIO_PAGO).map(([valor, etiqueta]) => <MenuItem key={valor} value={valor}>{etiqueta}</MenuItem>)}
        </Select>
        )}
      </Box>

      {cargando && !sinEstadisticas && <LinearProgress sx={{ mb: 2 }} />}
      {error && !sinEstadisticas && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tab === 'resumen' && (datosTab ? <ResumenVista datos={datosTab} onVerLocales={() => setTab('locales')} /> : !error && <Cargando />)}
      {tab === 'locales' && (datosTab ? <LocalesVista datos={datosTab} /> : !error && <Cargando />)}
      {tab === 'control' && (datosTab ? <ControlVista datos={datosTab} onVerBoleta={abrirBoleta} /> : !error && <Cargando />)}
      {tab === 'detalle' && (
        <DetalleVista
          parametros={parametros}
          usuario={usuario}
          onVerBoleta={abrirBoleta}
          version={version}
          onCambio={() => setVersion((v) => v + 1)}
        />
      )}

      {tab === 'historial' && (
        <HistorialVista parametros={parametros} onVerBoleta={abrirBoleta} version={version} />
      )}

      {(tab === 'revision' || tab === 'corregir') && (
        <RevisionVista
          modo={tab}
          usuario={usuario}
          locales={parametros.locales}
          version={version}
          onCambio={() => setVersion((v) => v + 1)}
          onVerBoleta={abrirBoleta}
          onCorregir={(boleta) => navegar(`/gastos/${encodeURIComponent(claveBoleta(boleta))}/corregir`)}
        />
      )}

      <VisorBoleta fotos={boleta} onCerrar={() => setBoleta(null)} />
    </Box>
  );
}

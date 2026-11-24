import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Badge, Box, Chip, IconButton, InputAdornment, MenuItem, Select, Table, TableBody, TableCell, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SearchIcon from '@mui/icons-material/Search';
import { obtenerHistorialGastos } from '../../services/historial';
import { COLOR, COLOR_MEDIO_PAGO, ETIQUETA_MEDIO_PAGO, Cargando, Kpi, Tarjeta, clp } from './comunes';
import { formatearFechaGasto, formatearFechaHora, rangoInstantes } from '../../utils/fechas';
import { fotosDe } from '../../utils/fotos';

const ETIQUETA_ROL = { MASTER: 'Master', ADMINISTRADOR: 'Administrador', ANALISTA: 'Analista', GERENCIA: 'Gerencia' };

// Cada evento del historial: cómo se llama, de qué color es y si se destaca la fila.
const ACCIONES = {
  CREADO: { etiqueta: 'Subido', filtro: 'Subidos', color: COLOR.verde, bg: '#E1EFE6' },
  ELIMINADO: { etiqueta: 'Eliminado', filtro: 'Eliminados', color: COLOR.rojo, bg: '#FBE3E3', fila: '#FFF6F6' },
  APROBADO: { etiqueta: 'Aprobado', filtro: 'Aprobados', color: '#2F6B49', bg: '#D5EBDD' },
  RECHAZADO: { etiqueta: 'Rechazado', filtro: 'Rechazados', color: COLOR.rojo, bg: '#FBE3E3', fila: '#FFF6F6' },
  EDITADO: { etiqueta: 'Corregido', filtro: 'Corregidos', color: '#3F66A5', bg: '#E4EBF8' },
  REABIERTO: { etiqueta: 'Reabierto', filtro: 'Reabiertos', color: '#8A6D3B', bg: '#F5EBDA' }
};

// Tabla del historial (pura). Cada fila es un evento de un gasto: se SUBIÓ, se ELIMINÓ, se APROBÓ, se RECHAZÓ, se CORRIGIÓ
// (EDITADO, tras un rechazo) o se REABRIÓ su revisión.
export function HistorialTabla({ eventos, onVerBoleta }) {
  const [accion, setAccion] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(25);

  const subidos = eventos.filter((e) => e.accion === 'CREADO');
  const eliminados = eventos.filter((e) => e.accion === 'ELIMINADO');
  const aprobados = eventos.filter((e) => e.accion === 'APROBADO');
  const rechazados = eventos.filter((e) => e.accion === 'RECHAZADO');
  const suma = (lista) => lista.reduce((a, e) => a + (e.gasto?.monto || 0), 0);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return eventos.filter((e) => {
      if (accion !== 'TODOS' && e.accion !== accion) return false;
      if (!q) return true;
      return [e.localNombre, e.gasto?.productoNombre, e.gasto?.motivo, e.motivoEliminacion, e.motivoRevision, e.realizadoPor?.nombre, e.gasto?.subidoPor?.nombre, e.gasto?.folio, e.gasto?.numeroDocumento]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [eventos, accion, busqueda]);

  const visibles = filtrados.slice(pagina * porPagina, pagina * porPagina + porPagina);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
        <Kpi etiqueta="Gastos subidos" valor={subidos.length} colorValor={COLOR.verde} sub={`${clp(suma(subidos))} en total`} />
        <Kpi
          etiqueta="Gastos eliminados"
          valor={eliminados.length}
          colorValor={eliminados.length ? COLOR.rojo : COLOR.ink}
          sub={`${clp(suma(eliminados))} en total`}
        />
        <Kpi etiqueta="Gastos aprobados" valor={aprobados.length} colorValor={COLOR.verde} sub={`${clp(suma(aprobados))} en total`} />
        <Kpi
          etiqueta="Gastos rechazados"
          valor={rechazados.length}
          colorValor={rechazados.length ? COLOR.rojo : COLOR.ink}
          sub={`${clp(suma(rechazados))} en total`}
        />
      </Box>

      <Tarjeta
        titulo="Historial de gastos"
        subtitulo="Cuándo se subió, eliminó, aprobó, rechazó o corrigió cada gasto, quién lo hizo y por qué. La boleta de un gasto eliminado se conserva."
        derecha={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Select
              size="small"
              value={accion}
              onChange={(e) => { setAccion(e.target.value); setPagina(0); }}
              inputProps={{ 'aria-label': 'Acción' }}
              sx={{ minWidth: 150, fontSize: 13 }}
            >
              <MenuItem value="TODOS">Acción: todas</MenuItem>
              {Object.entries(ACCIONES).map(([valor, a]) => <MenuItem key={valor} value={valor}>{a.filtro}</MenuItem>)}
            </Select>
            <TextField
              size="small"
              placeholder="Buscar local, ítem, persona…"
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }}
              sx={{ width: 240 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Box>
        }
      >
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha y hora</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Local</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Fecha del gasto</TableCell>
                <TableCell>Medio de pago</TableCell>
                <TableCell>Realizado por</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell align="center">Boleta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibles.map((e) => {
                const eliminado = e.accion === 'ELIMINADO';
                const accionInfo = ACCIONES[e.accion] || { etiqueta: e.accion, color: COLOR.ink, bg: COLOR.pista };
                const g = e.gasto || {};
                return (
                  <TableRow key={e._id || `${e.gastoId}-${e.accion}`} hover sx={accionInfo.fila ? { bgcolor: accionInfo.fila } : undefined}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatearFechaHora(e.fechaEvento)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={accionInfo.etiqueta}
                        sx={{ fontWeight: 700, fontSize: 11, bgcolor: accionInfo.bg, color: accionInfo.color }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{e.localNombre}</TableCell>
                    <TableCell>
                      {g.productoNombre}
                      <Typography sx={{ fontSize: 11, color: COLOR.muted }}>{g.cantidad} {String(g.unidadMedida || '').toLowerCase()}</Typography>
                      {(g.numeroDocumento != null || g.folio) && (
                        <Typography sx={{ fontSize: 11, color: COLOR.muted }}>
                          {[g.numeroDocumento != null ? `N° ${g.numeroDocumento}` : null, g.folio ? `Folio ${g.folio}` : null].filter(Boolean).join(' · ')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{clp(g.monto)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{g.fecha ? formatearFechaGasto(g.fecha) : ''}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={ETIQUETA_MEDIO_PAGO[g.medioPago] || g.medioPago}
                        sx={{ bgcolor: COLOR_MEDIO_PAGO[g.medioPago]?.bg, color: COLOR_MEDIO_PAGO[g.medioPago]?.color, fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {e.realizadoPor?.nombre}
                      <Typography sx={{ fontSize: 11, color: COLOR.muted }}>{ETIQUETA_ROL[e.realizadoPor?.rol] || e.realizadoPor?.rol}</Typography>
                      {eliminado && g.subidoPor?.nombre && (
                        <Typography sx={{ fontSize: 11, color: COLOR.muted }}>Lo subió {g.subidoPor.nombre}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      {eliminado && (
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLOR.rojo }}>{e.motivoEliminacion}</Typography>
                      )}
                      {(e.accion === 'RECHAZADO' || e.accion === 'REABIERTO') && e.motivoRevision && (
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: e.accion === 'RECHAZADO' ? COLOR.rojo : COLOR.ink }}>{e.motivoRevision}</Typography>
                      )}
                      <Tooltip title={g.motivo || ''}>
                        <Typography noWrap sx={{ fontSize: eliminado || e.motivoRevision ? 11 : 13, color: eliminado || e.motivoRevision ? COLOR.muted : COLOR.ink }}>
                          {g.motivo}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => onVerBoleta(fotosDe(g))} disabled={fotosDe(g).length === 0} aria-label="Ver boleta">
                        <Badge badgeContent={fotosDe(g).length} invisible={fotosDe(g).length < 2} color="primary" title={`${fotosDe(g).length} fotos`}>
                          <ReceiptIcon fontSize="small" />
                        </Badge>
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ color: COLOR.muted, py: 4 }}>
                    No hay movimientos en este período.
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
    </Box>
  );
}

// Carga el historial del período y filtros activos (locales y medio de pago).
export default function HistorialVista({ parametros, onVerBoleta, version = 0 }) {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState('');

  const consulta = useMemo(
    () => ({ ...rangoInstantes(parametros), locales: parametros.locales, medioPago: parametros.medioPago }),
    [parametros]
  );

  useEffect(() => {
    let cancelado = false;
    setError('');
    obtenerHistorialGastos(consulta)
      .then((d) => { if (!cancelado) setEventos(d); })
      .catch((e) => { if (!cancelado) setError(e.response?.data?.error || 'No se pudo cargar el historial'); });
    return () => { cancelado = true; };
  }, [consulta, version]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!eventos) return <Cargando />;
  return <HistorialTabla eventos={eventos} onVerBoleta={onVerBoleta} />;
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Badge, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { listarBoletas, revisarBoletas } from '../../services/revision';
import { MOTIVOS_RAPIDOS, MOTIVO_MAX, MOTIVO_RECHAZO_MIN, armarMotivoRechazo, puedeCorregirBoleta, puedeRevisarBoleta } from '../../utils/revision';
import { formatearFechaGasto, formatearFechaHora } from '../../utils/fechas';
import { describirError } from '../../utils/errores';
import { COLOR, COLOR_MEDIO_PAGO, ETIQUETA_MEDIO_PAGO, Cargando, Tarjeta, clp, humanizar } from './comunes';

// Pide el motivo del rechazo: es obligatorio, y es lo que verá quien subió la boleta para saber qué corregir.
// Se marcan uno o varios motivos frecuentes y, si se quiere, se agrega un comentario: el motivo final une todo.
export function DialogRechazar({ boleta, onCancelar, onConfirmar, enviando = false, error = '' }) {
  const [marcados, setMarcados] = useState([]);
  const [comentario, setComentario] = useState('');
  const motivo = armarMotivoRechazo(marcados, comentario);
  const valido = motivo.length >= MOTIVO_RECHAZO_MIN && motivo.length <= MOTIVO_MAX;
  const alternar = (m) => setMarcados((previos) => (previos.includes(m) ? previos.filter((x) => x !== m) : [...previos, m]));
  return (
    <Dialog open={!!boleta} onClose={enviando ? undefined : onCancelar} maxWidth="xs" fullWidth>
      <DialogTitle>Rechazar boleta{boleta && boleta.numeroDocumento != null ? ` N° ${boleta.numeroDocumento}` : ''}</DialogTitle>
      <DialogContent>
        {boleta && (
          <>
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5, mb: 2 }}>
              <Typography fontWeight={700} fontSize={14}>{boleta.local?.nombre} · {clp(boleta.total)}</Typography>
              <Typography variant="caption" color="text.secondary">
                Folio {boleta.folio || '—'} · la subió {boleta.subidoPor?.nombre}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Motivos frecuentes (marca los que apliquen)</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {MOTIVOS_RAPIDOS.map((m) => {
                const activo = marcados.includes(m);
                return (
                  <Chip
                    key={m}
                    label={m}
                    clickable
                    color={activo ? 'error' : 'default'}
                    variant={activo ? 'filled' : 'outlined'}
                    onClick={() => alternar(m)}
                    aria-pressed={activo}
                  />
                );
              })}
            </Box>
            <TextField
              multiline
              minRows={2}
              fullWidth
              label="Comentario adicional"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              inputProps={{ maxLength: 300 }}
              helperText={`Opcional si marcaste un motivo; si no, escribe al menos ${MOTIVO_RECHAZO_MIN} caracteres.`}
            />
            {motivo && (
              <Box sx={{ bgcolor: '#FBE3E3', borderRadius: 2, p: 1.5, mt: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">Quien subió la boleta verá:</Typography>
                <Typography fontSize={14} fontWeight={600} data-testid="motivo-final">{motivo}</Typography>
              </Box>
            )}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancelar} disabled={enviando}>Cancelar</Button>
        <Button color="error" variant="contained" disabled={!valido || enviando} onClick={() => onConfirmar(motivo)}>
          {enviando ? 'Rechazando…' : 'Rechazar boleta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ProductosDeBoleta({ lineas }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 480 }}>
        <TableHead>
          <TableRow>
            <TableCell>Producto</TableCell>
            <TableCell>Cuenta contable</TableCell>
            <TableCell align="right">Cantidad</TableCell>
            <TableCell align="right">Monto</TableCell>
            <TableCell>Motivo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lineas.map((l) => (
            <TableRow key={l._id}>
              <TableCell sx={{ fontWeight: 600 }}>{l.productoNombre}</TableCell>
              <TableCell sx={{ color: COLOR.muted }}>{humanizar(l.cuentaContable)}</TableCell>
              <TableCell align="right">{l.cantidad} {String(l.unidadMedida).toLowerCase()}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{clp(l.monto)}</TableCell>
              <TableCell sx={{ maxWidth: 260 }}>{l.motivo}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

// Una boleta con sus productos y fotos. En modo "revision" se aprueba o rechaza; en "corregir" se explica el rechazo.
function TarjetaBoleta({ boleta, modo, usuario, seleccionada, onSeleccionar, onVerBoleta, onAprobar, onRechazar, onCorregir, ocupada }) {
  const fotos = boleta.fotosBoletaUrls || [];
  const rechazo = boleta.rechazoAnterior;
  return (
    <Box sx={{ border: `1px solid ${COLOR.linea}`, borderRadius: 3, p: 2, mb: 2, bgcolor: 'background.paper' }} data-testid="boleta">
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap', mb: 1.5 }}>
        {modo === 'revision' && puedeRevisarBoleta(usuario, boleta) && (
          <Checkbox
            checked={seleccionada}
            onChange={() => onSeleccionar(boleta.id)}
            inputProps={{ 'aria-label': `Seleccionar boleta ${boleta.numeroDocumento ?? boleta.folio ?? ''}` }}
            sx={{ p: 0.5, mt: -0.5 }}
          />
        )}
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography fontWeight={700} fontSize={15}>
            {boleta.numeroDocumento != null ? `N° ${boleta.numeroDocumento}` : 'Boleta'}
            {boleta.folio ? ` · Folio ${boleta.folio}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {boleta.local?.nombre} · {boleta.fecha ? formatearFechaGasto(boleta.fecha) : ''} · la subió {boleta.subidoPor?.nombre}
            {boleta.subidoEn ? ` el ${formatearFechaHora(boleta.subidoEn)}` : ''}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={ETIQUETA_MEDIO_PAGO[boleta.medioPago] || boleta.medioPago}
          sx={{ bgcolor: COLOR_MEDIO_PAGO[boleta.medioPago]?.bg, color: COLOR_MEDIO_PAGO[boleta.medioPago]?.color, fontWeight: 700, fontSize: 11 }}
        />
        <Typography fontWeight={800} fontSize={18}>{clp(boleta.total)}</Typography>
      </Box>

      {modo === 'corregir' && boleta.motivoRechazo && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          <strong>Rechazada{boleta.revisadoPor?.nombre ? ` por ${boleta.revisadoPor.nombre}` : ''}
            {boleta.revisadoEn ? ` el ${formatearFechaHora(boleta.revisadoEn)}` : ''}:</strong> {boleta.motivoRechazo}
        </Alert>
      )}
      {modo === 'revision' && rechazo && rechazo.motivo && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Esta boleta se corrigió después de un rechazo{rechazo.por ? ` de ${rechazo.por}` : ''}: «{rechazo.motivo}».
          {boleta.vecesRechazado > 1 ? ` Ya se rechazó ${boleta.vecesRechazado} veces.` : ''}
        </Alert>
      )}

      <ProductosDeBoleta lineas={boleta.lineas} />

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 1.5, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<Badge badgeContent={fotos.length} invisible={fotos.length < 2} color="primary"><ReceiptIcon fontSize="small" /></Badge>}
          onClick={() => onVerBoleta(fotos)}
          disabled={fotos.length === 0}
          aria-label="Ver boleta"
        >
          Ver boleta{fotos.length > 1 ? ` (${fotos.length} fotos)` : ''}
        </Button>
        <Box sx={{ flex: 1 }} />
        {modo === 'revision' && puedeRevisarBoleta(usuario, boleta) && (
          <>
            <Button color="error" variant="outlined" onClick={() => onRechazar(boleta)} disabled={ocupada}>Rechazar</Button>
            <Button color="success" variant="contained" onClick={() => onAprobar(boleta)} disabled={ocupada}>Aprobar</Button>
          </>
        )}
        {modo === 'corregir' && puedeCorregirBoleta(usuario, boleta) && (
          <Button variant="contained" onClick={() => onCorregir(boleta)}>Corregir boleta</Button>
        )}
      </Box>
    </Box>
  );
}

// Cola de boletas. modo "revision": las pendientes de revisar (aprobar o rechazar, una a una o varias a la vez).
// modo "corregir": las rechazadas que subió quien mira, con el motivo y el botón para corregirlas.
export default function RevisionVista({ modo, usuario, locales, version = 0, onCambio, onVerBoleta, onCorregir }) {
  const [boletas, setBoletas] = useState(null);
  const [error, setError] = useState('');
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [ocupada, setOcupada] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'success' | 'warning', texto, detalles: [] }
  const [aRechazar, setARechazar] = useState(null);
  const [errorRechazo, setErrorRechazo] = useState('');
  const [recarga, setRecarga] = useState(0);

  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let cancelado = false;
    setError('');
    const params = modo === 'revision' ? { estado: 'PENDIENTE', excluirPropios: 1 } : { estado: 'RECHAZADO', propios: 1 };
    if (locales) params.locales = locales;
    listarBoletas(params)
      .then((d) => { if (!cancelado) { setBoletas(d); setSeleccion(new Set()); } })
      .catch((e) => { if (!cancelado) setError(describirError(e)); });
    return () => { cancelado = true; };
  }, [modo, locales, version, recarga]);

  const revisables = useMemo(() => (boletas || []).filter((b) => puedeRevisarBoleta(usuario, b)), [boletas, usuario]);
  const total = (boletas || []).reduce((a, b) => a + b.total, 0);

  function alternar(id) {
    setSeleccion((previa) => {
      const nueva = new Set(previa);
      if (nueva.has(id)) nueva.delete(id); else nueva.add(id);
      return nueva;
    });
  }
  const todasMarcadas = revisables.length > 0 && revisables.every((b) => seleccion.has(b.id));

  // Informa el resultado: lo que se pudo revisar y, aparte, lo que no (con su explicación).
  async function ejecutar(decision, boletasAfectadas, motivo) {
    setOcupada(true);
    setAviso(null);
    try {
      const r = await revisarBoletas({ decision, documentos: boletasAfectadas.map((b) => b.id), motivo });
      const verbo = decision === 'APROBAR' ? (r.documentos === 1 ? 'aprobada' : 'aprobadas') : (r.documentos === 1 ? 'rechazada' : 'rechazadas');
      const detalles = (r.omitidos || []).map((o) => {
        const b = boletasAfectadas.find((x) => x.id === o.id);
        return `${b && b.numeroDocumento != null ? `Boleta N° ${b.numeroDocumento}` : 'Una boleta'}: ${o.error}`;
      });
      if (r.documentos > 0) {
        setAviso({ tipo: detalles.length > 0 ? 'warning' : 'success', texto: `${r.documentos} ${r.documentos === 1 ? 'boleta' : 'boletas'} ${verbo}.`, detalles });
      } else {
        setAviso({ tipo: 'warning', texto: 'No se pudo revisar ninguna boleta.', detalles });
      }
      setARechazar(null);
      cargar();
      if (onCambio) onCambio();
      return true;
    } catch (e) {
      return describirError(e);
    } finally {
      setOcupada(false);
    }
  }

  async function confirmarRechazo(motivo) {
    setErrorRechazo('');
    const r = await ejecutar('RECHAZAR', [aRechazar], motivo);
    if (r !== true) setErrorRechazo(r);
  }

  async function aprobar(lista) {
    const r = await ejecutar('APROBAR', lista);
    if (r !== true) setAviso({ tipo: 'warning', texto: r, detalles: [] });
  }

  if (error) return <Alert severity="error" action={<Button color="inherit" size="small" onClick={cargar}>Reintentar</Button>}>{error}</Alert>;
  if (!boletas) return <Cargando />;

  const titulo = modo === 'revision' ? 'Boletas por revisar' : 'Boletas rechazadas por corregir';
  const subtitulo = modo === 'revision'
    ? 'Aprueba o rechaza cada boleta completa. Al rechazar debes indicar el motivo. No aparecen las que subiste tú.'
    : 'Estas boletas fueron rechazadas: corrígelas y volverán a revisión. Mientras tanto no suman en los totales.';

  return (
    <>
      <Tarjeta
        titulo={titulo}
        subtitulo={`${boletas.length} ${boletas.length === 1 ? 'boleta' : 'boletas'} · ${clp(total)}`}
        derecha={
          modo === 'revision' && revisables.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={todasMarcadas}
                    onChange={() => setSeleccion(todasMarcadas ? new Set() : new Set(revisables.map((b) => b.id)))}
                  />
                }
                label="Seleccionar todas"
              />
              <Button
                variant="contained"
                color="success"
                disabled={seleccion.size === 0 || ocupada}
                onClick={() => aprobar(revisables.filter((b) => seleccion.has(b.id)))}
              >
                Aprobar seleccionadas ({seleccion.size})
              </Button>
            </Box>
          ) : null
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitulo}</Typography>

        {aviso && (
          <Alert severity={aviso.tipo} sx={{ mb: 2 }} onClose={() => setAviso(null)}>
            {aviso.texto}
            {aviso.detalles.map((d) => <Box key={d} component="div" sx={{ fontSize: 13 }}>{d}</Box>)}
          </Alert>
        )}

        {boletas.length === 0 ? (
          <Typography sx={{ color: COLOR.muted, py: 4, textAlign: 'center' }}>
            {modo === 'revision' ? 'No hay boletas pendientes de revisión.' : 'No tienes boletas rechazadas por corregir.'}
          </Typography>
        ) : (
          boletas.map((b) => (
            <TarjetaBoleta
              key={b.id}
              boleta={b}
              modo={modo}
              usuario={usuario}
              seleccionada={seleccion.has(b.id)}
              onSeleccionar={alternar}
              onVerBoleta={onVerBoleta}
              onAprobar={(boleta) => aprobar([boleta])}
              onRechazar={(boleta) => { setErrorRechazo(''); setARechazar(boleta); }}
              onCorregir={onCorregir}
              ocupada={ocupada}
            />
          ))
        )}
      </Tarjeta>

      <DialogRechazar
        key={aRechazar ? aRechazar.id : 'cerrado'}
        boleta={aRechazar}
        enviando={ocupada}
        error={errorRechazo}
        onCancelar={() => setARechazar(null)}
        onConfirmar={confirmarRechazo}
      />
    </>
  );
}

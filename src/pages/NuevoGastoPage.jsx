import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, IconButton, InputAdornment, Link, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { listarLocales } from '../services/locales';
import { obtenerCatalogoCompleto } from '../services/catalogo';
import { crearDocumentoConFotos } from '../services/gastos';
import { corregirBoleta, obtenerBoleta } from '../services/revision';
import { useAuth } from '../context/AuthContext';
import { fechaLocalISO, formatearFechaGasto } from '../utils/fechas';
import { formatearMiles, soloDigitos } from '../utils/montos';
import { describirError } from '../utils/errores';
import { MAX_FOTO_ENVIO_MB, MAX_FOTOS, claveFoto, prepararFoto, validarFoto } from '../utils/fotos';
import {
  FOLIO_MAX, UNIDADES, armarPayloadCorreccion, armarPayloadDocumento, claveNueva, crearLinea, editorVacio, mensajeConfirmacion,
  textoProductos, totalDocumento, validarDocumento, validarLinea
} from '../utils/documento';
import { COLOR, ETIQUETA_MEDIO_PAGO, clp, humanizar } from '../components/dashboard/comunes';

// Resumen del contenido del formulario: sirve para saber si algo cambió respecto de la boleta que se está corrigiendo.
const firmaDe = (folio, fecha, medioPago, fotos, lineas) =>
  JSON.stringify([
    String(folio).trim(), fecha, medioPago, fotos.map((f) => f.clave),
    lineas.map((l) => [l.gastoId || l.id, l.productoCatalogoId, l.cantidad, l.unidad, l.monto, l.motivo])
  ]);

// Ingreso de gastos desde la web (administradores): una boleta o factura con uno o más productos, igual que en la app.
// Con una dirección /gastos/:id/corregir, la misma pantalla sirve para CORREGIR una boleta rechazada: se carga con sus
// datos, se arregla lo que se pidió y al enviarla vuelve a revisión.
export default function NuevoGastoPage() {
  const { id: idCorregir } = useParams();
  const editando = !!idCorregir;
  const { usuario } = useAuth();
  const [hoy] = useState(() => fechaLocalISO(new Date()));

  // documento
  const [locales, setLocales] = useState([]);
  const [cargandoLocales, setCargandoLocales] = useState(true);
  const [errorLocales, setErrorLocales] = useState('');
  const [local, setLocal] = useState(null);
  const [fecha, setFecha] = useState(hoy);
  const [medioPago, setMedioPago] = useState(null);
  const [folio, setFolio] = useState('');
  const [fotos, setFotos] = useState([]); // hasta 3: [{ id, clave, archivo, previa }]
  const [errorFoto, setErrorFoto] = useState('');
  const [preparandoFoto, setPreparandoFoto] = useState(false);

  // catálogo y productos
  const [catalogo, setCatalogo] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState('cargando'); // 'cargando' | 'ok' | 'error'
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [lineas, setLineas] = useState([]);
  const [producto, setProducto] = useState(null);
  const [inputProducto, setInputProducto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('UN');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');

  // guardado
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const [exito, setExito] = useState(null);
  const [folioRepetido, setFolioRepetido] = useState(null); // mensaje del servidor cuando el folio ya existe
  const [confirmacion, setConfirmacion] = useState(null); // { productos, total }: lo que se le pregunta antes de guardar

  // corrección de una boleta rechazada
  const [cargandoBoleta, setCargandoBoleta] = useState(editando);
  const [boletaOriginal, setBoletaOriginal] = useState(null);
  const [errorBoleta, setErrorBoleta] = useState('');
  const [corregida, setCorregida] = useState(null); // { numero, productos, total } cuando ya se envió
  const [editandoId, setEditandoId] = useState(null); // línea de la lista que se está editando
  const firmaInicialRef = useRef(null);

  // Anti-duplicados: la clave identifica a ESTA boleta mientras se llena el formulario (se renueva solo cuando se
  // guardó); `enCurso` ignora un segundo clic mientras el primero sigue en marcha; y las fotos que ya se subieron en
  // un intento que no terminó se reutilizan (por foto) en vez de subirlas otra vez.
  const claveRef = useRef(claveNueva());
  const enCursoRef = useRef(false);
  const urlsFotosRef = useRef({}); // { [id de la foto]: dirección ya subida }
  const fotosRef = useRef([]);
  const inicioRef = useRef(null);

  useEffect(() => {
    if (editando) { setCargandoLocales(false); return undefined; }
    let cancelado = false;
    listarLocales()
      .then((ls) => {
        if (cancelado) return;
        setLocales(ls);
        if (ls.length === 1) setLocal(ls[0]); // con un solo local no hay nada que elegir
      })
      .catch((err) => { if (!cancelado) setErrorLocales(describirError(err)); })
      .finally(() => { if (!cancelado) setCargandoLocales(false); });
    return () => { cancelado = true; };
  }, [editando]);

  // Al corregir: se carga la boleta con sus productos y fotos. Las fotos que ya estaban se reutilizan (no se vuelven a subir).
  useEffect(() => {
    if (!editando) return undefined;
    let cancelado = false;
    setCargandoBoleta(true);
    setErrorBoleta('');
    obtenerBoleta(idCorregir)
      .then((b) => {
        if (cancelado) return;
        const existentes = (b.fotosBoletaUrls || []).map((url) => ({ id: claveNueva(), clave: url, archivo: null, url, previa: url }));
        const lineasCargadas = b.lineas.map((l) => ({
          id: `g-${l._id}`, gastoId: String(l._id), productoCatalogoId: l.productoCatalogoId, productoNombre: l.productoNombre,
          categoria: l.categoria, cuentaContable: l.cuentaContable, cantidad: l.cantidad, unidad: l.unidadMedida, monto: l.monto, motivo: l.motivo
        }));
        urlsFotosRef.current = Object.fromEntries(existentes.map((f) => [f.id, f.url]));
        firmaInicialRef.current = firmaDe(b.folio || '', String(b.fecha).slice(0, 10), b.medioPago, existentes, lineasCargadas);
        setBoletaOriginal(b);
        setLocal({ _id: (b.local && b.local._id) || b.local, nombre: (b.local && b.local.nombre) || '' });
        setFecha(String(b.fecha).slice(0, 10));
        setMedioPago(b.medioPago);
        setFolio(b.folio || '');
        setFotos(existentes);
        setLineas(lineasCargadas);
      })
      .catch((err) => { if (!cancelado) setErrorBoleta(describirError(err)); })
      .finally(() => { if (!cancelado) setCargandoBoleta(false); });
    return () => { cancelado = true; };
  }, [editando, idCorregir]);

  const cargarCatalogo = useCallback(async () => {
    setEstadoCatalogo('cargando');
    setErrorCatalogo('');
    try {
      setCatalogo(await obtenerCatalogoCompleto());
      setEstadoCatalogo('ok');
    } catch (err) {
      setErrorCatalogo(describirError(err));
      setEstadoCatalogo('error');
    }
  }, []);

  useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);

  // Las vistas previas ocupan memoria del navegador: se liberan al salir de la pantalla.
  useEffect(() => { fotosRef.current = fotos; }, [fotos]);
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.previa)), []);

  // Si hay algo escrito, el navegador pregunta antes de cerrar o recargar la pestaña (para no perder una boleta a medias).
  // Al corregir, solo cuenta lo que se cambió respecto de la boleta original.
  const firmaActual = firmaDe(folio, fecha, medioPago, fotos, lineas);
  const hayCambios = editando
    ? !corregida && ((firmaInicialRef.current !== null && firmaActual !== firmaInicialRef.current) || !!producto || !!cantidad || !!monto)
    : lineas.length > 0 || !!folio || fotos.length > 0 || !!producto || !!cantidad || !!monto;
  useEffect(() => {
    if (!hayCambios) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  function quitarFoto(id) {
    setFotos((previas) => {
      const foto = previas.find((f) => f.id === id);
      if (foto) URL.revokeObjectURL(foto.previa);
      return previas.filter((f) => f.id !== id);
    });
    setErrorFoto('');
  }

  // Se pueden elegir varias fotos a la vez; entran hasta completar 3. Las que no sirven (formato, peso, repetidas o
  // sobre el límite) se omiten y se explica por qué.
  async function elegirFotos(e) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (archivos.length === 0) return;
    setErrorFoto('');
    setPreparandoFoto(true);
    const avisos = [];
    try {
      let cupo = MAX_FOTOS - fotosRef.current.length;
      const nuevas = [];
      for (const archivo of archivos) {
        const prefijo = archivos.length > 1 ? `${archivo.name}: ` : '';
        if (cupo <= 0) { avisos.push(`Solo se pueden adjuntar ${MAX_FOTOS} fotos por boleta.`); break; }
        const errorArchivo = validarFoto(archivo);
        if (errorArchivo) { avisos.push(`${prefijo}${errorArchivo}`); continue; }
        const clave = claveFoto(archivo);
        if ([...fotosRef.current, ...nuevas].some((f) => f.clave === clave)) { avisos.push(`${prefijo}Esa foto ya está agregada.`); continue; }
        const preparada = await prepararFoto(archivo);
        if (preparada.size > MAX_FOTO_ENVIO_MB * 1024 * 1024) {
          avisos.push(`${prefijo}La foto pesa más de ${MAX_FOTO_ENVIO_MB} MB y no se pudo reducir. Usa una imagen más liviana.`);
          continue;
        }
        nuevas.push({ id: claveNueva(), clave, archivo: preparada, previa: URL.createObjectURL(preparada) });
        cupo -= 1;
      }
      if (nuevas.length > 0) setFotos((previas) => [...previas, ...nuevas].slice(0, MAX_FOTOS));
      if (avisos.length > 0) setErrorFoto(avisos.join(' '));
    } finally {
      setPreparandoFoto(false);
    }
  }

  function limpiarEditor(motivoSiguiente = '') {
    setEditandoId(null);
    setProducto(null);
    setInputProducto('');
    setCantidad('');
    setUnidad('UN');
    setMonto('');
    setMotivo(motivoSiguiente);
  }

  // Suma el producto que se está escribiendo a la lista de la boleta. El motivo queda precargado con el del
  // producto anterior (suele ser el mismo) y se puede cambiar.
  // Si se está editando una línea de la lista, el producto del editor la reemplaza en su mismo lugar (conserva su identidad:
  // al corregir una boleta, el servidor la reconoce como el mismo producto y no como uno quitado y otro nuevo).
  function lineaDelEditor(lista) {
    const nueva = crearLinea({ productoSeleccionado: producto, cantidad, unidad, monto, motivo });
    const original = editandoId ? lista.find((l) => l.id === editandoId) : null;
    return original ? { ...nueva, id: original.id, ...(original.gastoId ? { gastoId: original.gastoId } : {}) } : nueva;
  }

  function incorporar(lista) {
    const linea = lineaDelEditor(lista);
    return editandoId && lista.some((l) => l.id === editandoId) ? lista.map((l) => (l.id === editandoId ? linea : l)) : [...lista, linea];
  }

  function agregarLinea() {
    const error = validarLinea({ productoSeleccionado: producto, cantidad, monto, motivo });
    if (error) { setErrorGuardar(error); return; }
    setErrorGuardar('');
    const motivoSiguiente = motivo.trim();
    setLineas((previas) => incorporar(previas));
    limpiarEditor(motivoSiguiente);
  }

  // Carga una línea ya agregada en el editor para cambiarla. Sigue en la lista hasta que se actualiza.
  function editarLinea(l) {
    if (!editorVacio({ productoTexto: inputProducto, productoSeleccionado: producto, cantidad, monto }) && !editandoId) {
      setErrorGuardar('Termina de agregar (o borra) el producto que estás escribiendo antes de editar otro.');
      return;
    }
    setErrorGuardar('');
    const enCatalogo = catalogo.find((c) => c._id === l.productoCatalogoId);
    const p = enCatalogo || { _id: l.productoCatalogoId, item: l.productoNombre, ratio: l.categoria, cuentaContable: l.cuentaContable };
    setProducto(p);
    setInputProducto(p.item);
    setCantidad(String(l.cantidad));
    setUnidad(l.unidad);
    setMonto(String(Math.round(l.monto))); // los montos son enteros (pesos)
    setMotivo(l.motivo);
    setEditandoId(l.id);
  }

  function quitarLinea(id) {
    if (id === editandoId) limpiarEditor('');
    setLineas((previas) => previas.filter((l) => l.id !== id));
  }

  function limpiarFormulario() {
    claveRef.current = claveNueva(); // la próxima boleta es otra: clave nueva
    urlsFotosRef.current = {};
    limpiarEditor('');
    setLineas([]);
    setFolio('');
    setMedioPago(null);
    fotosRef.current.forEach((f) => URL.revokeObjectURL(f.previa));
    setFotos([]);
    setErrorFoto('');
    // el local y la fecha se dejan: suelen ser los mismos de la boleta siguiente
  }

  // `confirmado`: la persona ya respondió "Sí" a la pregunta de antes de guardar (el diálogo de folio repetido no la repite).
  async function guardar({ confirmarFolioRepetido = false, confirmado = false } = {}) {
    if (enCursoRef.current) return;
    setErrorGuardar('');

    // Si hay un producto a medio escribir se avisa; si está completo, se agrega solo a la boleta.
    let todas = lineas;
    if (!editorVacio({ productoTexto: inputProducto, productoSeleccionado: producto, cantidad, monto })) {
      const errorLinea = validarLinea({ productoSeleccionado: producto, cantidad, monto, motivo });
      if (errorLinea) {
        setErrorGuardar(`Producto que estás ingresando: ${errorLinea}. Complétalo o bórralo para guardar la boleta.`);
        return;
      }
      todas = incorporar(lineas);
    }

    const errorValidacion = validarDocumento({ local, fecha, folio, medioPago, fotos, lineas: todas, hoy: fechaLocalISO(new Date()) });
    if (errorValidacion) { setErrorGuardar(errorValidacion); return; }

    // Antes de guardar, se confirma el monto: "Se agregará un gasto por el monto $5.543" (Sí / No).
    if (!confirmado) {
      setConfirmacion({ productos: todas.length, total: totalDocumento(todas) });
      return;
    }

    enCursoRef.current = true;
    setGuardando(true);
    setExito(null);
    try {
      const payload = editando
        ? armarPayloadCorreccion({ claveEdicion: claveRef.current, folio, fecha, medioPago, lineas: todas, confirmarFolioRepetido })
        : armarPayloadDocumento({ claveDocumento: claveRef.current, local, folio, fecha, medioPago, lineas: todas, confirmarFolioRepetido });
      const documento = await crearDocumentoConFotos(
        payload,
        fotos.map(({ id, archivo }) => ({ id, archivo })),
        { urlsPrevias: urlsFotosRef.current, ...(editando ? { enviar: (p) => corregirBoleta(idCorregir, p) } : {}) }
      );
      const resumen = { numero: documento.numeroDocumento, productos: todas.length, total: totalDocumento(todas), folio: documento.folio };
      if (editando) {
        setCorregida(resumen); // la boleta quedó pendiente de revisión: ya no se edita
      } else {
        setExito(resumen);
        limpiarFormulario();
      }
      if (inicioRef.current && inicioRef.current.scrollIntoView) inicioRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (err.urlsFotos) urlsFotosRef.current = { ...urlsFotosRef.current, ...err.urlsFotos };
      if (err.response?.status === 409 && err.response?.data?.codigo === 'FOLIO_REPETIDO') {
        setFolioRepetido(err.response.data.error);
      } else {
        setErrorGuardar(describirError(err));
      }
    } finally {
      enCursoRef.current = false;
      setGuardando(false);
    }
  }

  const sinLocales = !editando && !cargandoLocales && !errorLocales && locales.length === 0;
  // Un administrador solo corrige boletas rechazadas (el servidor también lo exige); el MASTER puede corregir cualquiera.
  const noCorregible = editando && boletaOriginal && boletaOriginal.estado !== 'RECHAZADO' && usuario && usuario.rol !== 'MASTER';
  const textoLocal = useMemo(() => (local ? local.nombre : ''), [local]);

  if (editando && (cargandoBoleta || errorBoleta || corregida || noCorregible)) {
    return (
      <Box sx={{ maxWidth: 980 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2.5 }}>Corregir boleta</Typography>
        {cargandoBoleta && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><CircularProgress size={20} /><Typography>Cargando la boleta…</Typography></Box>}
        {errorBoleta && <Alert severity="error" sx={{ mb: 2 }}>No se pudo cargar la boleta. {errorBoleta}</Alert>}
        {noCorregible && <Alert severity="warning" sx={{ mb: 2 }}>Esta boleta no está rechazada, por eso no se puede corregir.</Alert>}
        {corregida && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Boleta{corregida.numero ? ` N° ${corregida.numero}` : ''} corregida: {textoProductos(corregida.productos)} por {clp(corregida.total)}.
            Quedó pendiente de revisión.
          </Alert>
        )}
        {!cargandoBoleta && <Button component={RouterLink} to="/gastos" variant="outlined">Volver a los gastos</Button>}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 980 }}>
      <Box ref={inicioRef} sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={700}>
          {editando ? `Corregir boleta${boletaOriginal && boletaOriginal.numeroDocumento != null ? ` N° ${boletaOriginal.numeroDocumento}` : ''}` : 'Nuevo gasto'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {editando ? 'Corrige lo que se pidió y envíala de nuevo: quedará pendiente de revisión.' : 'Registra una boleta o factura con uno o más productos.'}
        </Typography>
      </Box>

      {editando && boletaOriginal && boletaOriginal.motivoRechazo && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Rechazada{boletaOriginal.revisadoPor && boletaOriginal.revisadoPor.nombre ? ` por ${boletaOriginal.revisadoPor.nombre}` : ''}:</strong> {boletaOriginal.motivoRechazo}
        </Alert>
      )}

      {exito && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setExito(null)}>
          Boleta{exito.numero ? ` N° ${exito.numero}` : ''} registrada: {textoProductos(exito.productos)} por {clp(exito.total)}.{' '}
          <Link component={RouterLink} to="/gastos" underline="always">Ver los gastos</Link>
        </Alert>
      )}
      {errorLocales && <Alert severity="error" sx={{ mb: 2 }}>No se pudieron cargar tus locales. {errorLocales}</Alert>}
      {sinLocales && (
        <Alert severity="warning" sx={{ mb: 2 }}>No tienes un local asignado. Pide que te asignen uno para poder registrar gastos.</Alert>
      )}

      {/* ---------- DOCUMENTO ---------- */}
      <Paper sx={{ p: 2.5, mb: 2.5 }}>
        <Typography fontWeight={700} fontSize={15} mb={2}>Boleta o factura</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr 1fr' } }}>
          {locales.length > 1 ? (
            <Autocomplete
              options={locales}
              value={local}
              onChange={(e, v) => setLocal(v)}
              getOptionLabel={(o) => o.nombre}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              noOptionsText="No hay locales que coincidan"
              renderInput={(params) => <TextField {...params} label="Local" required />}
            />
          ) : (
            <TextField label="Local" value={textoLocal} InputProps={{ readOnly: true }} />
          )}
          <TextField
            label="Fecha del gasto"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: hoy }}
          />
          <TextField
            label="N° de documento o folio"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            required
            inputProps={{ maxLength: FOLIO_MAX }}
            helperText="El número impreso en la boleta o factura"
          />
        </Box>

        <Box sx={{ mt: 2.5 }}>
          <Typography variant="body2" fontWeight={600} mb={1}>Medio de pago</Typography>
          <ToggleButtonGroup exclusive value={medioPago} onChange={(e, v) => setMedioPago(v)} aria-label="Medio de pago">
            {Object.entries(ETIQUETA_MEDIO_PAGO).map(([valor, etiqueta]) => (
              <ToggleButton key={valor} value={valor} sx={{ px: 2.5, textTransform: 'none' }}>{etiqueta}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mt: 2.5 }}>
          <Typography variant="body2" fontWeight={600} mb={0.5}>Fotos de la boleta o factura</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Hasta {MAX_FOTOS} fotos (por ejemplo, el frente y el reverso, o una boleta de varias hojas). Se necesita al menos una.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            {fotos.map((f, i) => (
              <Box key={f.id} sx={{ position: 'relative', width: 120 }}>
                <Box component="img" src={f.previa} alt={`Vista previa de la foto ${i + 1}`} sx={{ height: 80, width: '100%', objectFit: 'cover', borderRadius: 1.5, border: `1px solid ${COLOR.linea}`, display: 'block' }} />
                <IconButton
                  size="small"
                  onClick={() => quitarFoto(f.id)}
                  aria-label={`Quitar foto ${i + 1}`}
                  sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', border: `1px solid ${COLOR.linea}`, '&:hover': { bgcolor: 'background.paper' } }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {f.archivo ? `${f.archivo.name} · ${(f.archivo.size / 1024).toFixed(0)} KB` : 'Foto ya subida'}
                </Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 80 }}>
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} disabled={preparandoFoto || fotos.length >= MAX_FOTOS}>
                {fotos.length === 0 ? 'Subir foto' : 'Agregar otra foto'}
                <input
                  hidden
                  multiple
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Foto de la boleta"
                  onChange={elegirFotos}
                />
              </Button>
              {preparandoFoto && <CircularProgress size={20} />}
              <Typography variant="caption" color="text.secondary">{fotos.length} de {MAX_FOTOS}</Typography>
            </Box>
          </Box>
          {errorFoto && <Alert severity="error" sx={{ mt: 1.5 }}>{errorFoto}</Alert>}
        </Box>
      </Paper>

      {/* ---------- PRODUCTOS ---------- */}
      <Paper sx={{ p: 2.5, mb: 2.5 }}>
        <Typography fontWeight={700} fontSize={15} mb={0.5}>Productos de la boleta</Typography>
        {lineas.length === 0 && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            Agrega cada producto de la boleta. Si trae varios, súmalos uno a uno.
          </Typography>
        )}

        {lineas.length > 0 && (
          <Box sx={{ overflowX: 'auto', mb: 2 }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Cuenta contable</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineas.map((l, i) => (
                  <TableRow key={l.id} sx={l.id === editandoId ? { bgcolor: '#FFF8E6' } : undefined}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{l.productoNombre}</TableCell>
                    <TableCell sx={{ color: COLOR.muted }}>{humanizar(l.cuentaContable)}</TableCell>
                    <TableCell align="right">{l.cantidad} {l.unidad.toLowerCase()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{clp(l.monto)}</TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>{l.motivo}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton size="small" onClick={() => editarLinea(l)} aria-label={`Editar ${l.productoNombre}`}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => quitarLinea(l.id)} aria-label={`Quitar ${l.productoNombre}`}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>Total ({textoProductos(lineas.length)})</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 15 }}>{clp(totalDocumento(lineas))}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}

        {estadoCatalogo === 'error' && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={<Button color="inherit" size="small" onClick={cargarCatalogo}>Reintentar</Button>}
          >
            No se pudo cargar el catálogo de productos. {errorCatalogo}
          </Alert>
        )}

        <Typography variant="body2" fontWeight={600} mb={1.5}>{editandoId ? 'Editando un producto' : lineas.length > 0 ? 'Otro producto' : 'Producto'}</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' } }}>
          <Autocomplete
            options={catalogo}
            loading={estadoCatalogo === 'cargando'}
            value={producto}
            onChange={(e, v) => setProducto(v)}
            inputValue={inputProducto}
            onInputChange={(e, v) => setInputProducto(v)}
            getOptionLabel={(o) => o.item}
            isOptionEqualToValue={(a, b) => a._id === b._id}
            noOptionsText="No hay productos que coincidan. Revisa cómo está escrito."
            loadingText="Cargando productos…"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Producto (ítem)"
                helperText={producto ? `${humanizar(producto.ratio)} · Cuenta: ${humanizar(producto.cuentaContable)}` : 'Escribe para buscar en el catálogo'}
              />
            )}
          />
          <TextField
            label="Cantidad"
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            inputProps={{ min: 0, step: 'any' }}
          />
          <TextField label="Unidad" select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            {UNIDADES.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>
          <TextField
            label="Monto de este producto"
            value={formatearMiles(monto)}
            onChange={(e) => setMonto(soloDigitos(e.target.value))}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            inputProps={{ inputMode: 'numeric' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="Motivo del gasto"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarLinea(); } }}
            placeholder="¿Cuál es el motivo de este gasto?"
            sx={{ flex: 1, minWidth: 260 }}
          />
          <Button variant="outlined" startIcon={editandoId ? <EditIcon /> : <AddIcon />} onClick={agregarLinea} sx={{ mt: 0.5, py: 1.1 }}>
            {editandoId ? 'Actualizar producto' : 'Agregar producto'}
          </Button>
          {editandoId && (
            <Button color="inherit" onClick={() => limpiarEditor('')} sx={{ mt: 0.5, py: 1.1 }}>Cancelar edición</Button>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          Si la boleta trae más productos, agrégalos uno a uno. Al guardar, el producto que tengas escrito se agrega solo.
        </Typography>
      </Paper>

      {errorGuardar && <Alert severity="error" sx={{ mb: 2 }}>{errorGuardar}</Alert>}

      <Button
        variant="contained"
        size="large"
        onClick={() => guardar()}
        disabled={guardando || cargandoLocales}
        startIcon={guardando ? <CircularProgress size={18} color="inherit" /> : null}
        sx={{ px: 5, py: 1.3 }}
      >
        {guardando ? (editando ? 'Enviando…' : 'Guardando…') : editando ? 'Enviar corrección' : 'Guardar boleta'}
      </Button>

      <Dialog open={!!confirmacion} onClose={() => setConfirmacion(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editando ? 'Confirmar corrección' : 'Confirmar gasto'}</DialogTitle>
        <DialogContent>
          {confirmacion && (
            <>
              <DialogContentText sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                {mensajeConfirmacion({
                  productos: confirmacion.productos, totalTexto: clp(confirmacion.total), correccion: editando,
                  numero: editando && boletaOriginal ? boletaOriginal.numeroDocumento : null
                })}
              </DialogContentText>
              <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5, fontSize: 13, lineHeight: 1.8 }}>
                <div><strong>Local:</strong> {local ? local.nombre : ''}</div>
                <div><strong>Folio:</strong> {String(folio).trim()}</div>
                <div><strong>Fecha:</strong> {formatearFechaGasto(`${fecha}T00:00:00.000Z`)}</div>
                <div><strong>Medio de pago:</strong> {ETIQUETA_MEDIO_PAGO[medioPago] || medioPago}</div>
              </Box>
              <Typography variant="body2" sx={{ mt: 2 }}>¿Confirmas?</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmacion(null)}>No</Button>
          <Button variant="contained" onClick={() => { setConfirmacion(null); guardar({ confirmado: true }); }} autoFocus>Sí</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!folioRepetido} onClose={() => setFolioRepetido(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Folio ya registrado</DialogTitle>
        <DialogContent>
          <DialogContentText>{folioRepetido}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFolioRepetido(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => { setFolioRepetido(null); guardar({ confirmarFolioRepetido: true, confirmado: true }); }}
          >
            Es otro documento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

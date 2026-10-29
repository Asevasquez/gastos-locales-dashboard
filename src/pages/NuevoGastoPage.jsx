import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, IconButton, InputAdornment, Link, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import { listarLocales } from '../services/locales';
import { obtenerCatalogoCompleto } from '../services/catalogo';
import { crearDocumentoConFotos } from '../services/gastos';
import { fechaLocalISO } from '../utils/fechas';
import { describirError } from '../utils/errores';
import { MAX_FOTO_ENVIO_MB, MAX_FOTOS, claveFoto, prepararFoto, validarFoto } from '../utils/fotos';
import {
  FOLIO_MAX, UNIDADES, armarPayloadDocumento, claveNueva, crearLinea, editorVacio, textoProductos, totalDocumento,
  validarDocumento, validarLinea
} from '../utils/documento';
import { COLOR, ETIQUETA_MEDIO_PAGO, clp, humanizar } from '../components/dashboard/comunes';

// Ingreso de gastos desde la web (administradores): una boleta o factura con uno o más productos, igual que en la app.
export default function NuevoGastoPage() {
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

  // Anti-duplicados: la clave identifica a ESTA boleta mientras se llena el formulario (se renueva solo cuando se
  // guardó); `enCurso` ignora un segundo clic mientras el primero sigue en marcha; y las fotos que ya se subieron en
  // un intento que no terminó se reutilizan (por foto) en vez de subirlas otra vez.
  const claveRef = useRef(claveNueva());
  const enCursoRef = useRef(false);
  const urlsFotosRef = useRef({}); // { [id de la foto]: dirección ya subida }
  const fotosRef = useRef([]);
  const inicioRef = useRef(null);

  useEffect(() => {
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
  }, []);

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
  const hayCambios = lineas.length > 0 || !!folio || fotos.length > 0 || !!producto || !!cantidad || !!monto;
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
    setProducto(null);
    setInputProducto('');
    setCantidad('');
    setUnidad('UN');
    setMonto('');
    setMotivo(motivoSiguiente);
  }

  // Suma el producto que se está escribiendo a la lista de la boleta. El motivo queda precargado con el del
  // producto anterior (suele ser el mismo) y se puede cambiar.
  function agregarLinea() {
    const error = validarLinea({ productoSeleccionado: producto, cantidad, monto, motivo });
    if (error) { setErrorGuardar(error); return; }
    setErrorGuardar('');
    const linea = crearLinea({ productoSeleccionado: producto, cantidad, unidad, monto, motivo });
    setLineas((previas) => [...previas, linea]);
    limpiarEditor(linea.motivo);
  }

  function quitarLinea(id) {
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

  async function guardar({ confirmarFolioRepetido = false } = {}) {
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
      todas = [...lineas, crearLinea({ productoSeleccionado: producto, cantidad, unidad, monto, motivo })];
    }

    const errorValidacion = validarDocumento({ local, fecha, folio, medioPago, fotos, lineas: todas, hoy: fechaLocalISO(new Date()) });
    if (errorValidacion) { setErrorGuardar(errorValidacion); return; }

    enCursoRef.current = true;
    setGuardando(true);
    setExito(null);
    try {
      const payload = armarPayloadDocumento({ claveDocumento: claveRef.current, local, folio, fecha, medioPago, lineas: todas, confirmarFolioRepetido });
      const documento = await crearDocumentoConFotos(
        payload,
        fotos.map(({ id, archivo }) => ({ id, archivo })),
        { urlsPrevias: urlsFotosRef.current }
      );
      setExito({ numero: documento.numeroDocumento, productos: todas.length, total: totalDocumento(todas), folio: documento.folio });
      limpiarFormulario();
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

  const sinLocales = !cargandoLocales && !errorLocales && locales.length === 0;
  const textoLocal = useMemo(() => (local ? local.nombre : ''), [local]);

  return (
    <Box sx={{ maxWidth: 980 }}>
      <Box ref={inicioRef} sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={700}>Nuevo gasto</Typography>
        <Typography variant="body2" color="text.secondary">
          Registra una boleta o factura con uno o más productos.
        </Typography>
      </Box>

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
                  {f.archivo.name} · {(f.archivo.size / 1024).toFixed(0)} KB
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
                  <TableCell align="center">Quitar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineas.map((l, i) => (
                  <TableRow key={l.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{l.productoNombre}</TableCell>
                    <TableCell sx={{ color: COLOR.muted }}>{humanizar(l.cuentaContable)}</TableCell>
                    <TableCell align="right">{l.cantidad} {l.unidad.toLowerCase()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{clp(l.monto)}</TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>{l.motivo}</TableCell>
                    <TableCell align="center">
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

        <Typography variant="body2" fontWeight={600} mb={1.5}>{lineas.length > 0 ? 'Otro producto' : 'Producto'}</Typography>
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
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            inputProps={{ min: 0, step: 1 }}
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
          <Button variant="outlined" startIcon={<AddIcon />} onClick={agregarLinea} sx={{ mt: 0.5, py: 1.1 }}>
            Agregar producto
          </Button>
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
        {guardando ? 'Guardando…' : 'Guardar boleta'}
      </Button>

      <Dialog open={!!folioRepetido} onClose={() => setFolioRepetido(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Folio ya registrado</DialogTitle>
        <DialogContent>
          <DialogContentText>{folioRepetido}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFolioRepetido(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => { setFolioRepetido(null); guardar({ confirmarFolioRepetido: true }); }}
          >
            Es otro documento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

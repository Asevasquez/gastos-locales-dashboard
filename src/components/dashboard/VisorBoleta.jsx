import React, { useEffect, useRef, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Link, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { acercar, alejar, deCostado, girar, transformacion } from '../../utils/visorImagen';

const ALTO_MARCO = 460;

// Una foto con zoom (botones, rueda del mouse o doble clic), arrastre para moverla cuando está ampliada, y giro de 90°.
function ImagenZoom({ url, alt }) {
  const [zoom, setZoom] = useState(1);
  const [giro, setGiro] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const marco = useRef(null);
  const origen = useRef(null);

  // La rueda del mouse acerca y aleja la foto. Se registra "a mano" porque debe poder cancelar el desplazamiento de la página.
  useEffect(() => {
    const el = marco.current;
    if (!el) return undefined;
    const alGirarRueda = (e) => {
      e.preventDefault();
      setZoom((z) => (e.deltaY < 0 ? acercar(z) : alejar(z)));
    };
    el.addEventListener('wheel', alGirarRueda, { passive: false });
    return () => el.removeEventListener('wheel', alGirarRueda);
  }, []);

  // sin ampliar no hay nada que mover: la foto vuelve al centro
  useEffect(() => {
    if (zoom <= 1) setPos({ x: 0, y: 0 });
  }, [zoom]);

  const restablecer = () => { setZoom(1); setGiro(0); setPos({ x: 0, y: 0 }); };

  function alPresionar(e) {
    if (zoom <= 1) return;
    origen.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setArrastrando(true);
    if (e.currentTarget.setPointerCapture && e.pointerId !== undefined) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* sin captura: igual se puede arrastrar */ }
    }
  }
  function alMover(e) {
    if (!origen.current) return;
    setPos({ x: e.clientX - origen.current.x, y: e.clientY - origen.current.y });
  }
  function alSoltar() {
    origen.current = null;
    setArrastrando(false);
  }

  const boton = (etiqueta, icono, onClick, desactivado = false) => (
    <Tooltip title={etiqueta}>
      <span>
        <IconButton size="small" onClick={onClick} aria-label={etiqueta} disabled={desactivado}>{icono}</IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
        {boton('Acercar', <ZoomInIcon fontSize="small" />, () => setZoom((z) => acercar(z)))}
        {boton('Alejar', <ZoomOutIcon fontSize="small" />, () => setZoom((z) => alejar(z)))}
        <Typography variant="caption" sx={{ minWidth: 42, textAlign: 'center' }} aria-label="Nivel de zoom">{Math.round(zoom * 100)}%</Typography>
        {boton('Girar a la izquierda', <RotateLeftIcon fontSize="small" />, () => setGiro((g) => girar(g, -1)))}
        {boton('Girar a la derecha', <RotateRightIcon fontSize="small" />, () => setGiro((g) => girar(g, 1)))}
        {boton('Restablecer', <RestartAltIcon fontSize="small" />, restablecer, zoom === 1 && giro === 0)}
      </Box>
      <Box
        ref={marco}
        data-testid="marco-imagen"
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2.5))}
        sx={{
          height: ALTO_MARCO, overflow: 'hidden', bgcolor: '#14110D', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: zoom > 1 ? (arrastrando ? 'grabbing' : 'grab') : 'zoom-in', touchAction: 'none'
        }}
      >
        <Box
          component="img"
          src={url}
          alt={alt}
          draggable={false}
          data-testid="imagen-boleta"
          // de costado, el ancho de la foto pasa a ser su alto: se limita para que siga cabiendo en el marco
          sx={{ maxWidth: deCostado(giro) ? `${ALTO_MARCO}px` : '100%', maxHeight: '100%', userSelect: 'none' }}
          style={{ transform: transformacion({ x: pos.x, y: pos.y, zoom, giro }), transition: arrastrando ? 'none' : 'transform 0.15s ease' }}
        />
      </Box>
    </Box>
  );
}

// Muestra las fotos de una boleta o factura (de 1 a 3), una bajo otra, cada una con zoom y giro.
export default function VisorBoleta({ fotos, onCerrar }) {
  const lista = fotos || [];
  const varias = lista.length > 1;
  return (
    <Dialog open={lista.length > 0} onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {varias ? `Boleta / factura · ${lista.length} fotos` : 'Boleta / factura'}
        <IconButton size="small" onClick={onCerrar} aria-label="Cerrar"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Rueda del mouse o doble clic para acercar; arrastra la foto para moverla cuando está ampliada.
        </Typography>
        {lista.map((url, i) => (
          <Box key={url} sx={{ mb: i < lista.length - 1 ? 3 : 0 }}>
            {varias && <Typography variant="caption" color="text.secondary">Foto {i + 1} de {lista.length}</Typography>}
            <ImagenZoom url={url} alt={varias ? `Foto ${i + 1} de la boleta` : 'Boleta o factura del gasto'} />
            <Link href={url} target="_blank" rel="noopener noreferrer" variant="caption" underline="always">
              Abrir en una pestaña nueva
            </Link>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}

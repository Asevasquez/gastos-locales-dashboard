import React, { useState } from 'react';
import { Box, Button, Popover, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SelectorLocales from '../SelectorLocales';

// Texto del botón: "Todos (10)", los nombres si son 1 o 2, o "3 de 10".
export function textoFiltroLocales(locales, seleccion) {
  if (!seleccion || seleccion.length === 0 || seleccion.length >= locales.length) {
    return `Locales: Todos (${locales.length})`;
  }
  const nombres = seleccion.map((id) => locales.find((l) => l._id === id)?.nombre).filter(Boolean);
  if (nombres.length <= 2) return `Locales: ${nombres.join(', ')}`;
  return `Locales: ${seleccion.length} de ${locales.length}`;
}

// `seleccion`: array de ids, o null = todos los locales. El cambio se aplica una sola vez, al
// apretar "Aplicar" (así el dashboard no se recarga en cada checkbox).
export default function FiltroLocales({ locales, seleccion, onAplicar }) {
  const [ancla, setAncla] = useState(null);
  const [borrador, setBorrador] = useState([]);
  const abierto = Boolean(ancla);
  const filtrado = seleccion && seleccion.length > 0 && seleccion.length < locales.length;

  function abrir(e) {
    setBorrador(seleccion && seleccion.length ? seleccion : locales.map((l) => l._id));
    setAncla(e.currentTarget);
  }

  function aplicar() {
    onAplicar(borrador.length >= locales.length ? null : borrador);
    setAncla(null);
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={abrir}
        endIcon={abierto ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        sx={{
          bgcolor: 'background.paper',
          color: '#3A3530',
          borderColor: filtrado || abierto ? 'primary.main' : '#DBD5C8',
          maxWidth: 360,
          '& .MuiButton-endIcon': { color: '#8A8476' }
        }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {textoFiltroLocales(locales, seleccion)}
        </Box>
      </Button>

      <Popover
        open={abierto}
        anchorEl={ancla}
        onClose={() => setAncla(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { mt: 1, width: 400, boxShadow: '0 12px 32px rgba(31,27,22,.16)' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid #F1EDE5' }}>
          <Typography fontWeight={700} fontSize={14}>Locales</Typography>
          <Button size="small" onClick={() => setBorrador([])} sx={{ fontSize: 12 }}>Limpiar selección</Button>
        </Box>
        <Box sx={{ px: 2, pt: 1.5 }}>
          <SelectorLocales locales={locales} seleccionados={borrador} onChange={setBorrador} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2, py: 1.5, borderTop: '1px solid #F1EDE5', mt: 1 }}>
          <Button onClick={() => setAncla(null)}>Cancelar</Button>
          <Button variant="contained" onClick={aplicar} disabled={borrador.length === 0}>Aplicar</Button>
        </Box>
      </Popover>
    </>
  );
}

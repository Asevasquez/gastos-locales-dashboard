import React from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Link, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Muestra las fotos de una boleta o factura (de 1 a 3), una bajo otra.
export default function VisorBoleta({ fotos, onCerrar }) {
  const lista = fotos || [];
  const varias = lista.length > 1;
  return (
    <Dialog open={lista.length > 0} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {varias ? `Boleta / factura · ${lista.length} fotos` : 'Boleta / factura'}
        <IconButton size="small" onClick={onCerrar} aria-label="Cerrar"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        {lista.map((url, i) => (
          <Box key={url} sx={{ mb: i < lista.length - 1 ? 2.5 : 0 }}>
            {varias && <Typography variant="caption" color="text.secondary">Foto {i + 1} de {lista.length}</Typography>}
            <Box
              component="img"
              src={url}
              alt={varias ? `Foto ${i + 1} de la boleta` : 'Boleta o factura del gasto'}
              sx={{ width: '100%', borderRadius: 2, display: 'block' }}
            />
            <Link href={url} target="_blank" rel="noopener noreferrer" variant="caption" underline="always">
              Abrir en una pestaña nueva
            </Link>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}

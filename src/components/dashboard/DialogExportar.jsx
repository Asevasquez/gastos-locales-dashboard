import React, { useState } from 'react';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Typography } from '@mui/material';
import { ESTADOS, ETIQUETA_ESTADO } from '../../utils/revision';

// Elegir qué estados incluir en el Excel de gastos. Por defecto, todos (pendientes, aprobados y rechazados).
export default function DialogExportar({ abierto, descripcion, exportando = false, onCancelar, onExportar }) {
  const [elegidos, setElegidos] = useState(ESTADOS);
  const alternar = (estado) => setElegidos((previos) => (previos.includes(estado) ? previos.filter((e) => e !== estado) : [...previos, estado]));
  return (
    <Dialog open={abierto} onClose={exportando ? undefined : onCancelar} maxWidth="xs" fullWidth>
      <DialogTitle>Exportar a Excel</DialogTitle>
      <DialogContent>
        {descripcion && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{descripcion}</Typography>}
        <Typography fontWeight={600} fontSize={14} sx={{ mb: 0.5 }}>Gastos que se incluyen</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {ESTADOS.map((e) => (
            <FormControlLabel
              key={e}
              control={<Checkbox size="small" checked={elegidos.includes(e)} onChange={() => alternar(e)} />}
              label={`${ETIQUETA_ESTADO[e]}s`}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          El archivo trae la columna ESTADO, y para los rechazados, el motivo, quién revisó y cuándo.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancelar} disabled={exportando}>Cancelar</Button>
        <Button variant="contained" disabled={elegidos.length === 0 || exportando} onClick={() => onExportar(elegidos)}>
          {exportando ? 'Exportando…' : 'Exportar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

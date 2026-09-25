import React, { useRef, useState } from 'react';
import { Box, Typography, Paper, Button, Alert, CircularProgress } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { importarCatalogoExcel } from '../services/catalogo';

export default function CatalogoPage() {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  async function manejarArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    setError('');
    setResultado(null);
    try {
      const data = await importarCatalogoExcel(archivo);
      setResultado(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo procesar el archivo');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Catálogo de ítems
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Sube el Excel con las columnas ITEM, DETALLE (opcional), RATIO y CUENTA CONTABLE.
        Reemplaza el catálogo que usa el autocompletado de la app.
      </Typography>

      <Paper sx={{ p: 4, maxWidth: 520 }}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={manejarArchivo}
          style={{ display: 'none' }}
        />
        <Button
          variant="contained"
          startIcon={subiendo ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
        >
          {subiendo ? 'Procesando…' : 'Subir Excel'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {resultado && (
          <Alert severity="success" sx={{ mt: 3 }}>
            {resultado.procesados} ítem(s) actualizados
            {resultado.omitidos > 0 && `, ${resultado.omitidos} fila(s) omitidas por datos incompletos`}
            {resultado.desactivados > 0 &&
              `, ${resultado.desactivados} ítem(s) antiguos desactivados (ya no vienen en la planilla)`}
            .
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          Los ítems que ya existen se actualizan por nombre. Los que ya no vienen en la planilla
          nueva se desactivan (no se borran), para no romper gastos históricos que ya los
          referencian.
        </Typography>
      </Paper>
    </Box>
  );
}

import React, { useMemo, useState } from 'react';
import { Box, Checkbox, FormControlLabel, TextField, Typography, Divider } from '@mui/material';

const ETIQUETA_MARCA = {
  KAMI_SUSHI: 'KAMI SUSHI',
  LATIN_PIZZA: 'LATIN PIZZA'
};

// Selector de locales con checkboxes: "Todos los locales" arriba, buscador, y los
// locales agrupados por marca (cada grupo con su propio checkbox para marcar toda
// la marca de una vez). `seleccionados` es un array de ids; `onChange` recibe el
// array nuevo completo.
export default function SelectorLocales({ locales, seleccionados, onChange }) {
  const [busqueda, setBusqueda] = useState('');

  const idsSeleccionados = useMemo(() => new Set(seleccionados), [seleccionados]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = q ? locales.filter((l) => l.nombre.toLowerCase().includes(q)) : locales;
    return [...filtrados].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [locales, busqueda]);

  const grupos = useMemo(() => {
    const mapa = {};
    for (const l of visibles) {
      if (!mapa[l.marca]) mapa[l.marca] = [];
      mapa[l.marca].push(l);
    }
    return Object.entries(mapa);
  }, [visibles]);

  const totalSeleccionados = locales.filter((l) => idsSeleccionados.has(l._id)).length;
  const todosMarcados = locales.length > 0 && totalSeleccionados === locales.length;
  const algunosMarcados = totalSeleccionados > 0 && !todosMarcados;

  function alternarTodos() {
    onChange(todosMarcados ? [] : locales.map((l) => l._id));
  }

  function alternarLocal(id) {
    const nuevo = new Set(idsSeleccionados);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    onChange([...nuevo]);
  }

  // Marca/desmarca todos los locales visibles de un grupo (respeta el buscador).
  function alternarGrupo(localesDelGrupo) {
    const todosDelGrupoMarcados = localesDelGrupo.every((l) => idsSeleccionados.has(l._id));
    const nuevo = new Set(idsSeleccionados);
    for (const l of localesDelGrupo) {
      if (todosDelGrupoMarcados) nuevo.delete(l._id);
      else nuevo.add(l._id);
    }
    onChange([...nuevo]);
  }

  return (
    <Box>
      <FormControlLabel
        control={
          <Checkbox checked={todosMarcados} indeterminate={algunosMarcados} onChange={alternarTodos} />
        }
        label={<Typography fontWeight={700}>Todos los locales ({locales.length})</Typography>}
      />

      <TextField
        size="small"
        fullWidth
        placeholder="Buscar local…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        sx={{ my: 1 }}
      />

      <Box
        sx={{
          maxHeight: 300,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          px: 1.5,
          py: 0.5
        }}
      >
        {grupos.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {locales.length === 0 ? 'Todavía no hay locales creados.' : 'Ningún local coincide con la búsqueda.'}
          </Typography>
        )}

        {grupos.map(([marca, localesDelGrupo], i) => {
          const marcadosEnGrupo = localesDelGrupo.filter((l) => idsSeleccionados.has(l._id)).length;
          const grupoCompleto = marcadosEnGrupo === localesDelGrupo.length;
          const grupoParcial = marcadosEnGrupo > 0 && !grupoCompleto;

          return (
            <Box key={marca}>
              {i > 0 && <Divider sx={{ my: 0.5 }} />}
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={grupoCompleto}
                    indeterminate={grupoParcial}
                    onChange={() => alternarGrupo(localesDelGrupo)}
                  />
                }
                label={
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {ETIQUETA_MARCA[marca] || marca} ({marcadosEnGrupo}/{localesDelGrupo.length})
                  </Typography>
                }
              />
              <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column' }}>
                {localesDelGrupo.map((l) => (
                  <FormControlLabel
                    key={l._id}
                    control={
                      <Checkbox
                        size="small"
                        checked={idsSeleccionados.has(l._id)}
                        onChange={() => alternarLocal(l._id)}
                      />
                    }
                    label={<Typography variant="body2">{l.nombre}</Typography>}
                  />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {totalSeleccionados} de {locales.length} seleccionados
      </Typography>
    </Box>
  );
}

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export const COLOR = {
  rojo: '#F20000',
  ink: '#1F1B16',
  muted: '#8A8476',
  linea: '#EAE6DF',
  pista: '#F1EDE5',
  verde: '#3B7A57',
  ambar: '#C98A2B',
  azul: '#4E7BC1'
};

export const ETIQUETA_MARCA = { KAMI_SUSHI: 'KAMI SUSHI', LATIN_PIZZA: 'LATIN PIZZA', 'SIN MARCA': 'SIN MARCA' };

export const ETIQUETA_MEDIO_PAGO = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO_FLUJO: 'Efectivo flujo'
};

export const COLOR_MEDIO_PAGO = {
  EFECTIVO: { color: '#3B7A57', bg: '#E1EFE6' },
  TRANSFERENCIA: { color: '#4E7BC1', bg: '#E4EBF8' },
  EFECTIVO_FLUJO: { color: '#8A6D3B', bg: '#F5EBDA' }
};

// Producción (rojo), producción indirecta (ámbar), administración y ventas (azul).
export function colorCategoria(categoria) {
  if (categoria === 'gasto_de_producción') return COLOR.rojo;
  if (categoria === 'gasto_de_producción_indirecto') return COLOR.ambar;
  if (categoria === 'gastos_de_administración_y_ventas') return COLOR.azul;
  return '#6B6558';
}

export function clp(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;
}

export function pct(n, decimales = 1) {
  return `${Number(n || 0).toLocaleString('es-CL', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  })}%`;
}

// 1.250.000 -> "$1,3M", 419.000 -> "$419K"
export function clpCompacto(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1).replace('.', ',')}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v)}`;
}

export function humanizar(texto) {
  if (!texto) return '';
  const limpio = String(texto).replace(/_/g, ' ').trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// Variación del GASTO: subir es "malo" (rojo), bajar es "bueno" (verde).
export function Variacion({ valor }) {
  if (valor === null || valor === undefined) {
    return <Box component="span" sx={{ color: COLOR.muted }}>—</Box>;
  }
  if (valor === 0) {
    return <Box component="span" sx={{ color: COLOR.muted, fontWeight: 600 }}>= 0%</Box>;
  }
  const sube = valor > 0;
  return (
    <Box component="span" sx={{ color: sube ? COLOR.rojo : COLOR.verde, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {sube ? '▲' : '▼'} {pct(Math.abs(valor))}
    </Box>
  );
}

export function Tarjeta({ titulo, subtitulo, derecha, children, sx }) {
  return (
    <Paper sx={{ p: 2.25, minWidth: 0, ...sx }}>
      {(titulo || derecha) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1.75 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} fontSize={14}>{titulo}</Typography>
            {subtitulo && <Typography variant="caption" color="text.secondary">{subtitulo}</Typography>}
          </Box>
          {derecha}
        </Box>
      )}
      {children}
    </Paper>
  );
}

export function Kpi({ etiqueta, valor, sub, destacado, colorValor, tamano = 26, sx }) {
  return (
    <Paper
      sx={{
        p: 2.25,
        minWidth: 0,
        ...(destacado && { bgcolor: '#FFF6F6', borderColor: '#F9C9C9' }),
        ...sx
      }}
    >
      <Typography
        sx={{ fontSize: 12, fontWeight: 700, color: destacado ? COLOR.rojo : COLOR.muted, textTransform: destacado ? 'uppercase' : 'none' }}
      >
        {etiqueta}
      </Typography>
      <Typography sx={{ fontSize: tamano, fontWeight: 700, lineHeight: 1.2, mt: 0.75, color: colorValor || COLOR.ink }}>
        {valor}
      </Typography>
      {sub && <Typography component="div" sx={{ fontSize: 12, mt: 0.75, color: '#6B6558', lineHeight: 1.5 }}>{sub}</Typography>}
    </Paper>
  );
}

// Barra de progreso simple. valor = 0..100
export function Barra({ valor, color = COLOR.rojo, alto = 7, fondo = COLOR.pista }) {
  const ancho = Math.max(0, Math.min(100, Number(valor) || 0));
  return (
    <Box sx={{ height: alto, borderRadius: 999, bgcolor: fondo }}>
      <Box sx={{ width: `${ancho}%`, height: alto, borderRadius: 999, bgcolor: color }} />
    </Box>
  );
}

// Mini gráfico de barras (tendencia). La última barra (período actual) va en rojo.
export function BarrasMini({ valores }) {
  const max = Math.max(1, ...valores);
  return (
    <Box sx={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: 28 }}>
      {valores.map((v, i) => (
        <Box
          key={i}
          sx={{
            width: 9,
            height: Math.max(3, Math.round((v / max) * 26)),
            borderRadius: '2px 2px 0 0',
            bgcolor: i === valores.length - 1 ? COLOR.rojo : '#CFC8B8'
          }}
        />
      ))}
    </Box>
  );
}

export function Pildora({ children, color, bg, sx }) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color, bgcolor: bg, px: 1, py: '2px', borderRadius: 999, whiteSpace: 'nowrap', ...sx }}
    >
      {children}
    </Box>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <Box sx={{ py: 8, textAlign: 'center', color: COLOR.muted }}>
      <Typography variant="body2">{texto}</Typography>
    </Box>
  );
}

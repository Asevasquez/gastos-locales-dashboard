import React, { useMemo, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Typography } from '@mui/material';
import { Barra, COLOR, ETIQUETA_MARCA, Tarjeta, Variacion, clp, pct } from './comunes';
import { diasEntre, textoUltimoRegistro } from '../../utils/fechas';

const COLORES_COMPOSICION = { produccion: '#F20000', indirecto: '#C98A2B', admin: '#4E7BC1', otros: '#B0A99B' };

function ComposicionMini({ comp }) {
  if (!comp) return <span>—</span>;
  return (
    <Box sx={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', minWidth: 90 }} title={`Producción ${comp.produccion}% · Indirecto ${comp.indirecto}% · Admin. y ventas ${comp.admin}%`}>
      {['produccion', 'indirecto', 'admin', 'otros'].map((k) => (
        <Box key={k} sx={{ width: `${comp[k]}%`, height: 8, bgcolor: COLORES_COMPOSICION[k] }} />
      ))}
    </Box>
  );
}

const COLUMNAS = [
  { id: 'nombre', etiqueta: 'Local', alinear: 'left' },
  { id: 'total', etiqueta: 'Total', alinear: 'right' },
  { id: 'porcentaje', etiqueta: '% del total', alinear: 'left' },
  { id: 'n', etiqueta: 'N°', alinear: 'right' },
  { id: 'ticket', etiqueta: 'Ticket', alinear: 'right' },
  { id: 'pctEfectivo', etiqueta: '% efec.', alinear: 'right' },
  { id: 'composicion', etiqueta: 'Composición', alinear: 'left', sinOrden: true },
  { id: 'ultimoRegistro', etiqueta: 'Último reg.', alinear: 'left' },
  { id: 'variacionPct', etiqueta: 'vs ant.', alinear: 'right' }
];

function valorOrden(fila, campo) {
  if (campo === 'nombre') return fila.local.nombre.toLowerCase();
  if (campo === 'ultimoRegistro') return fila.ultimoRegistro || '';
  if (campo === 'variacionPct') return fila.variacionPct === null ? -Infinity : fila.variacionPct;
  return fila[campo];
}

function TablaLocales({ d }) {
  const [orden, setOrden] = useState({ campo: 'total', dir: 'desc' });
  const hoy = d.periodo.hoy;
  const umbralEf = d.umbrales.efectivoPct;
  const umbralDias = d.umbrales.sinActividadDias;

  const filas = useMemo(() => {
    const conRegistro = d.filas.filter((f) => !f.sinRegistro);
    const sinRegistro = d.filas.filter((f) => f.sinRegistro);
    const signo = orden.dir === 'asc' ? 1 : -1;
    conRegistro.sort((a, b) => {
      const va = valorOrden(a, orden.campo);
      const vb = valorOrden(b, orden.campo);
      if (va < vb) return -1 * signo;
      if (va > vb) return 1 * signo;
      return 0;
    });
    return [...conRegistro, ...sinRegistro]; // los locales sin registro siempre al final
  }, [d.filas, orden]);

  function cambiarOrden(campo) {
    setOrden((o) => (o.campo === campo ? { campo, dir: o.dir === 'desc' ? 'asc' : 'desc' } : { campo, dir: campo === 'nombre' ? 'asc' : 'desc' }));
  }

  // el backend entrega los locales ordenados por total (de mayor a menor): el primero con registro es el mayor gasto
  const idMayor = d.filas.find((f) => !f.sinRegistro)?.local._id ?? null;

  const leyenda = [['Producción', COLORES_COMPOSICION.produccion], ['Indirecto', COLORES_COMPOSICION.indirecto], ['Admin. y ventas', COLORES_COMPOSICION.admin]];
  return (
    <Tarjeta
      titulo="Comparación entre locales"
      subtitulo="Toca un encabezado para ordenar"
      derecha={
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {leyenda.map(([n, c]) => (
            <Box key={n} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 11, color: COLOR.muted }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: c }} />{n}
            </Box>
          ))}
        </Box>
      }
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 28 }}>#</TableCell>
              {COLUMNAS.map((c) => (
                <TableCell key={c.id} align={c.alinear} sortDirection={orden.campo === c.id ? orden.dir : false}>
                  {c.sinOrden ? c.etiqueta : (
                    <TableSortLabel active={orden.campo === c.id} direction={orden.campo === c.id ? orden.dir : 'desc'} onClick={() => cambiarOrden(c.id)}>
                      {c.etiqueta}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.map((f, i) => {
              if (f.sinRegistro) {
                return (
                  <TableRow key={f.local._id} sx={{ color: '#B0A99B' }}>
                    <TableCell sx={{ color: 'inherit' }}>—</TableCell>
                    <TableCell sx={{ color: 'inherit' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#6B6558' }}>{f.local.nombre}</Typography>
                      <Typography sx={{ fontSize: 11 }}>{ETIQUETA_MARCA[f.local.marca] || f.local.marca}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'inherit' }}>—</TableCell>
                    <TableCell sx={{ color: 'inherit' }}>—</TableCell>
                    <TableCell align="right" sx={{ color: 'inherit' }}>0</TableCell>
                    <TableCell align="right" sx={{ color: 'inherit' }}>—</TableCell>
                    <TableCell align="right" sx={{ color: 'inherit' }}>—</TableCell>
                    <TableCell sx={{ color: 'inherit' }}>—</TableCell>
                    <TableCell sx={{ color: COLOR.rojo, fontWeight: 700 }}>{textoUltimoRegistro(f.ultimoRegistro, hoy)}</TableCell>
                    <TableCell align="right" sx={{ color: 'inherit' }}>—</TableCell>
                  </TableRow>
                );
              }
              const esMayor = f.local._id === idMayor;
              const diasSin = f.ultimoRegistro ? diasEntre(hoy, f.ultimoRegistro) : null;
              return (
                <TableRow key={f.local._id} sx={esMayor ? { bgcolor: '#FFF6F6' } : undefined}>
                  <TableCell sx={{ fontWeight: 700, color: esMayor ? COLOR.rojo : COLOR.muted }}>{i + 1}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{f.local.nombre}</Typography>
                    <Typography sx={{ fontSize: 11, color: COLOR.muted }}>{ETIQUETA_MARCA[f.local.marca] || f.local.marca}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{clp(f.total)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 40 }}><Barra valor={Math.min(100, f.porcentaje * 4)} color={esMayor ? COLOR.rojo : '#4A4238'} alto={6} /></Box>
                      <Typography sx={{ fontSize: 11, color: COLOR.muted, width: 40, textAlign: 'right' }}>{pct(f.porcentaje)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{f.n}</TableCell>
                  <TableCell align="right">{clp(f.ticket)}</TableCell>
                  <TableCell align="right" sx={f.pctEfectivo > umbralEf ? { color: COLOR.rojo, fontWeight: 700 } : undefined}>{pct(f.pctEfectivo, 0)}</TableCell>
                  <TableCell><ComposicionMini comp={f.composicion} /></TableCell>
                  <TableCell sx={diasSin !== null && diasSin >= umbralDias ? { color: COLOR.rojo, fontWeight: 700 } : undefined}>
                    {textoUltimoRegistro(f.ultimoRegistro, hoy)}
                  </TableCell>
                  <TableCell align="right"><Variacion valor={f.variacionPct} /></TableCell>
                </TableRow>
              );
            })}
            {filas.length === 0 && (
              <TableRow><TableCell colSpan={10} align="center" sx={{ color: COLOR.muted, py: 4 }}>No hay locales para mostrar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <Typography sx={{ fontSize: 12, color: COLOR.muted, mt: 1.5 }}>
        <Box component="span" sx={{ color: COLOR.rojo, fontWeight: 700 }}>Rojo</Box> = más de {umbralEf}% en efectivo, {umbralDias} o más días sin registro, o gasto en alza.
      </Typography>
    </Tarjeta>
  );
}

function Variacion6({ d }) {
  const filas = d.filas.filter((f) => f.variacionPct !== null).sort((a, b) => b.variacionPct - a.variacionPct);
  const maxAbs = Math.max(10, ...filas.map((f) => Math.abs(f.variacionPct)));
  return (
    <Tarjeta titulo="Variación vs período anterior" subtitulo="Cada local comparado con el mismo tramo del período anterior">
      {filas.length === 0 && <Typography variant="body2" color="text.secondary">No hay datos del período anterior para comparar.</Typography>}
      {filas.map((f) => {
        const ancho = (Math.abs(f.variacionPct) / maxAbs) * 45;
        const sube = f.variacionPct > 0;
        const color = sube ? COLOR.rojo : COLOR.verde;
        return (
          <Box key={f.local._id} sx={{ display: 'flex', alignItems: 'center', minHeight: 28 }}>
            <Typography sx={{ width: 190, flexShrink: 0, fontSize: 12, fontWeight: 600, pr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.local.nombre}</Typography>
            <Box sx={{ position: 'relative', flex: 1, height: 14 }}>
              <Box sx={{ position: 'absolute', left: '50%', top: -6, bottom: -6, borderLeft: '1px solid #B0A99B' }} />
              <Box
                sx={{
                  position: 'absolute', height: 12, bgcolor: color,
                  ...(sube ? { left: '50%', borderRadius: '0 4px 4px 0' } : { right: '50%', borderRadius: '4px 0 0 4px' }),
                  width: `${ancho}%`
                }}
              />
              <Typography
                sx={{
                  position: 'absolute', fontSize: 11, fontWeight: 700, color, top: -2, whiteSpace: 'nowrap',
                  ...(sube ? { left: `calc(50% + ${ancho}% + 6px)` } : { right: `calc(50% + ${ancho}% + 6px)` })
                }}
              >
                {sube ? '+' : '−'}{pct(Math.abs(f.variacionPct), 0)}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Tarjeta>
  );
}

function Concentracion({ d }) {
  const orden = d.filas.filter((f) => !f.sinRegistro).sort((a, b) => b.total - a.total);
  const colores = ['#F20000', '#F54D4D', '#F98C8C', '#6B6558', '#8A8476', '#B0A99B', '#CFC8B8', '#E3DED2'];
  const top3 = orden.slice(0, 3).reduce((a, f) => a + f.porcentaje, 0);
  return (
    <Tarjeta titulo="Concentración del gasto" subtitulo="Cuánto pesa cada local en el total">
      {orden.length === 0 && <Typography variant="body2" color="text.secondary">Sin gastos en el período.</Typography>}
      {orden.length > 0 && (
        <>
          <Box sx={{ display: 'flex', borderRadius: '6px', overflow: 'hidden' }}>
            {orden.map((f, i) => (
              <Box key={f.local._id} title={`${f.local.nombre}: ${pct(f.porcentaje)}`} sx={{ width: `${f.porcentaje}%`, height: 30, bgcolor: colores[Math.min(i, colores.length - 1)] }} />
            ))}
          </Box>
          <Box sx={{ position: 'relative', height: 34, mt: 0.75 }}>
            {[50, 80].map((m) => (
              <React.Fragment key={m}>
                <Box sx={{ position: 'absolute', left: `${m}%`, top: 0, height: 14, borderLeft: `1.5px dashed ${COLOR.ink}` }} />
                <Typography sx={{ position: 'absolute', left: `${m}%`, top: 14, fontSize: 10, ml: '-8px' }}>{m}%</Typography>
              </React.Fragment>
            ))}
          </Box>
          <Typography sx={{ fontSize: 13, mb: 1 }}>
            <b style={{ color: COLOR.rojo }}>{Math.min(3, orden.length)} {orden.length === 1 ? 'local concentra' : 'locales concentran'} el {pct(Math.min(100, top3))}</b> del gasto del período.
          </Typography>
          {orden.slice(0, 5).map((f, i) => (
            <Box key={f.local._id} sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 26, fontSize: 12 }}>
              <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: colores[i] }} />
              <Box sx={{ flex: 1 }}>{f.local.nombre}</Box>
              <b>{pct(f.porcentaje)}</b>
            </Box>
          ))}
        </>
      )}
    </Tarjeta>
  );
}

export default function LocalesVista({ datos }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <TablaLocales d={datos} />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' } }}>
        <Variacion6 d={datos} />
        <Concentracion d={datos} />
      </Box>
    </Box>
  );
}

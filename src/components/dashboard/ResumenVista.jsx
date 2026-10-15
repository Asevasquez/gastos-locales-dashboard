import React, { useState } from 'react';
import { Box, Button, Link, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import {
  Barra, BarrasMini, COLOR, ETIQUETA_MARCA, ETIQUETA_MEDIO_PAGO, Kpi, Pildora, Tarjeta, Variacion,
  clp, clpCompacto, colorCategoria, humanizar, pct
} from './comunes';
import { diaMesCorto } from '../../utils/fechas';

const grilla = (columnas) => ({ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: columnas } });

function techoRedondo(max) {
  if (max <= 0) return 1;
  const pot = 10 ** Math.floor(Math.log10(max));
  return ([1, 2, 2.5, 5, 10].find((m) => m * pot >= max) || 10) * pot;
}

function Kpis({ d }) {
  const mayor = d.localMayorGasto;
  const ant = d.periodo.anterior;
  const rangoAnterior = `${diaMesCorto(ant.desde)} – ${diaMesCorto(ant.hasta)}`;
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '1.15fr 1.5fr 1fr 1fr 1fr' } }}>
      <Kpi
        etiqueta="Total del período"
        valor={clp(d.total)}
        sub={
          <>
            <div>
              {d.variacionPct === null ? 'Sin datos del período anterior' : <><Variacion valor={d.variacionPct} /> vs {rangoAnterior}</>}
            </div>
            {d.proyeccionCierre !== null && <div>Cierre proyectado <b>{clpCompacto(d.proyeccionCierre)}</b></div>}
          </>
        }
      />
      <Kpi
        destacado
        etiqueta="Local con mayor gasto"
        tamano={20}
        valor={mayor ? mayor.local.nombre : '—'}
        sub={
          mayor ? (
            <>
              <div>{clp(mayor.total)} · {pct(mayor.porcentaje)} del total · <Variacion valor={mayor.variacionPct} /></div>
              <Box sx={{ mt: 1 }}><Barra valor={mayor.porcentaje} color={COLOR.rojo} fondo="#F9D4D4" /></Box>
            </>
          ) : 'Sin gastos en el período'
        }
      />
      <Kpi
        etiqueta="Promedio por local"
        valor={clp(d.promedioPorLocal)}
        sub={
          <>
            <div>{d.localesConRegistro} locales con registro</div>
            <Box component="div" sx={{ color: d.localesSinRegistro.length ? COLOR.rojo : COLOR.muted, fontWeight: 700 }}>
              {d.localesSinRegistro.length} sin registro
            </Box>
          </>
        }
      />
      <Kpi etiqueta="Gastos registrados" valor={d.gastosRegistrados} sub={<>Ticket promedio<br /><b>{clp(d.ticketPromedio)}</b> por gasto</>} />
      <Kpi
        etiqueta="Gasto en efectivo"
        valor={pct(d.efectivo.porcentaje, 0)}
        sub={
          <>
            <div>{clp(d.efectivo.monto)}</div>
            <Box component="div" sx={{ color: d.efectivo.localesSobreUmbral ? COLOR.rojo : COLOR.muted, fontWeight: 700 }}>
              {d.efectivo.localesSobreUmbral === 1 ? '1 local' : `${d.efectivo.localesSobreUmbral} locales`} sobre {d.efectivo.umbral}%
            </Box>
          </>
        }
      />
    </Box>
  );
}

function GraficoDiario({ d }) {
  const dias = d.evolucionDiaria;
  const max = Math.max(...dias.map((x) => x.total), 0);
  const techo = techoRedondo(Math.max(max, d.promedioDiario));
  const alto = 180;
  const paso = Math.ceil(dias.length / 16);
  const diaMax = max > 0 ? dias.find((x) => x.total === max) : null;
  return (
    <Tarjeta
      titulo="Evolución diaria del gasto"
      subtitulo="Monto total por día"
      derecha={diaMax && <Typography variant="caption" color="text.secondary">Día de mayor gasto: <b style={{ color: COLOR.ink }}>{diaMesCorto(diaMax.fecha)}</b></Typography>}
    >
      <Box sx={{ position: 'relative', ml: 6, height: alto + 28 }}>
        <Box sx={{ position: 'relative', height: alto }}>
          {[0, 0.5, 1].map((f) => (
            <React.Fragment key={f}>
              <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: f * alto, borderTop: `1px dashed ${COLOR.linea}` }} />
              <Typography sx={{ position: 'absolute', left: -48, bottom: f * alto + 2, fontSize: 10, color: '#B0A99B' }}>{clpCompacto(techo * f)}</Typography>
            </React.Fragment>
          ))}
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', gap: dias.length > 20 ? '3px' : '8px', alignItems: 'flex-end' }}>
            {dias.map((x) => (
              <Box
                key={x.fecha}
                title={`${diaMesCorto(x.fecha)}: ${clp(x.total)}`}
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}
              >
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 34,
                    height: (x.total / techo) * alto,
                    bgcolor: COLOR.rojo,
                    opacity: diaMax && x.fecha === diaMax.fecha ? 1 : 0.82,
                    borderRadius: '5px 5px 0 0'
                  }}
                />
              </Box>
            ))}
          </Box>
          {d.promedioDiario > 0 && (
            <>
              <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: (d.promedioDiario / techo) * alto, borderTop: `2px dashed ${COLOR.ink}`, opacity: 0.55 }} />
              <Typography sx={{ position: 'absolute', right: 4, bottom: (d.promedioDiario / techo) * alto + 4, fontSize: 10, fontWeight: 700, bgcolor: '#fff', px: 0.5 }}>
                Prom. diario {clpCompacto(d.promedioDiario)}
              </Typography>
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: dias.length > 20 ? '3px' : '8px', mt: 0.75 }}>
          {dias.map((x, i) => (
            <Box key={x.fecha} sx={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLOR.muted }}>
              {i % paso === 0 ? Number(x.fecha.slice(8)) : ''}
            </Box>
          ))}
        </Box>
      </Box>
    </Tarjeta>
  );
}

function Ranking({ d, onVerLocales }) {
  const top = d.ranking.slice(0, 5);
  const max = top[0] ? top[0].total : 1;
  return (
    <Tarjeta titulo="Ranking de locales" subtitulo="Gasto del período, de mayor a menor">
      {top.length === 0 && <Typography variant="body2" color="text.secondary">Sin gastos en el período.</Typography>}
      {top.map((r, i) => (
        <Box key={r.local._id} sx={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 1.25, alignItems: 'center', minHeight: 46 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLOR.muted }}>{i + 1}</Typography>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, flexWrap: 'wrap', gap: 1 }}>
              {r.local.nombre}
              {i === 0 && <Pildora color={COLOR.rojo} bg="#FBD9D9" sx={{ fontSize: 10 }}>MAYOR GASTO</Pildora>}
            </Box>
            <Box sx={{ mt: 0.75 }}><Barra valor={(r.total / max) * 100} color={i === 0 ? COLOR.rojo : '#4A4238'} /></Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{clp(r.total)}</Typography>
            <Typography sx={{ fontSize: 11, color: COLOR.muted }}>{pct(r.porcentaje)}</Typography>
          </Box>
        </Box>
      ))}
      {d.ranking.length > 5 && onVerLocales && (
        <Link component="button" type="button" onClick={onVerLocales} underline="none" sx={{ mt: 1, fontSize: 12, fontWeight: 600 }}>
          Ver los {d.ranking.length} locales →
        </Link>
      )}
    </Tarjeta>
  );
}

function Composicion({ d }) {
  return (
    <Tarjeta titulo="Composición por categoría" subtitulo="Según el RATIO del ítem">
      {d.porCategoria.length === 0 && <Typography variant="body2" color="text.secondary">Sin datos.</Typography>}
      {d.porCategoria.length > 0 && (
        <Box sx={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', mb: 1.5 }}>
          {d.porCategoria.map((c) => <Box key={c.categoria} sx={{ width: `${c.porcentaje}%`, height: 18, bgcolor: colorCategoria(c.categoria) }} />)}
        </Box>
      )}
      {d.porCategoria.map((c) => (
        <Box key={c.categoria} sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 40, borderTop: '1px solid #F1EDE5' }}>
          <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: colorCategoria(c.categoria), flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, flex: 1, lineHeight: 1.25 }}>{humanizar(c.categoria)}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{clp(c.total)}</Typography>
          <Typography sx={{ fontSize: 11, color: COLOR.muted, width: 40, textAlign: 'right' }}>{pct(c.porcentaje, 0)}</Typography>
        </Box>
      ))}
    </Tarjeta>
  );
}

function Dona({ d }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const colores = { EFECTIVO: '#3B7A57', TRANSFERENCIA: '#4E7BC1', EFECTIVO_FLUJO: '#8A6D3B' };
  let acumulado = 0;
  return (
    <Tarjeta titulo="Medio de pago" subtitulo="Participación en el monto total">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.25 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="Participación por medio de pago">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#F1EDE5" strokeWidth="16" />
          {d.porMedioPago.map((m) => {
            const largo = (m.porcentaje / 100) * c;
            const arco = (
              <circle
                key={m.medioPago}
                cx="60" cy="60" r={r} fill="none" stroke={colores[m.medioPago]} strokeWidth="16"
                strokeDasharray={`${largo} ${c}`} strokeDashoffset={-acumulado} transform="rotate(-90 60 60)"
              />
            );
            acumulado += largo;
            return arco;
          })}
          <text x="60" y="60" textAnchor="middle" fontSize="20" fontWeight="700" fill={COLOR.ink}>{pct(d.efectivo.porcentaje, 0)}</text>
          <text x="60" y="76" textAnchor="middle" fontSize="10" fill={COLOR.muted}>efectivo</text>
        </svg>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {d.porMedioPago.map((m) => (
            <Box key={m.medioPago} sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 34 }}>
              <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: colores[m.medioPago] }} />
              <Typography sx={{ fontSize: 12, flex: 1 }}>{ETIQUETA_MEDIO_PAGO[m.medioPago]}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{pct(m.porcentaje, 0)}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Tarjeta>
  );
}

function Marcas({ d }) {
  const colores = ['#F20000', '#4E7BC1', '#8A6D3B'];
  return (
    <Tarjeta titulo="Gasto por marca" subtitulo="Comparación entre marcas">
      {d.porMarca.length === 0 && <Typography variant="body2" color="text.secondary">Sin datos.</Typography>}
      {d.porMarca.map((m, i) => (
        <Box key={m.marca} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{ETIQUETA_MARCA[m.marca] || m.marca}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {clp(m.total)} <Box component="span" sx={{ fontSize: 11, color: COLOR.muted, fontWeight: 600 }}>· {pct(m.porcentaje)}</Box>
            </Typography>
          </Box>
          <Box sx={{ my: 0.75 }}><Barra valor={m.porcentaje} color={colores[i % colores.length]} alto={9} /></Box>
          <Typography sx={{ fontSize: 11, color: COLOR.muted }}>
            {m.localesConRegistro} {m.localesConRegistro === 1 ? 'local' : 'locales'} con registro · promedio por local <b style={{ color: COLOR.ink }}>{clp(m.promedioPorLocal)}</b>
          </Typography>
        </Box>
      ))}
    </Tarjeta>
  );
}

// Compara cada cuenta contable con el período anterior, o con el promedio de los 3 anteriores.
// `serie` trae 6 períodos: [..., antepenúltimo, anterior, actual].
function filasCuentas(cuentas, modo) {
  return cuentas.map((c) => {
    const base = modo === 'anterior' ? c.serie[4] : (c.serie[2] + c.serie[3] + c.serie[4]) / 3;
    const delta = c.actual - base;
    return { ...c, base, delta, variacion: base > 0 ? (delta / base) * 100 : null };
  });
}

function Cuentas({ d, modo, setModo, verTodas, setVerTodas }) {
  const filas = filasCuentas(d.cuentas, modo);
  const visibles = verTodas ? filas : filas.slice(0, 8);
  const ant = d.periodo.anterior;
  const subtitulo = `${diaMesCorto(d.periodo.actual.desde)} – ${diaMesCorto(d.periodo.actual.hasta)} comparado con ${modo === 'anterior' ? `${diaMesCorto(ant.desde)} – ${diaMesCorto(ant.hasta)}` : 'el promedio de los 3 períodos anteriores'} (el mismo tramo)`;
  return (
    <Tarjeta
      titulo="Cuentas contables vs período anterior"
      subtitulo={subtitulo}
      derecha={
        <ToggleButtonGroup size="small" exclusive value={modo} onChange={(e, v) => v && setModo(v)} sx={{ flexShrink: 0 }}>
          <ToggleButton value="anterior" sx={{ fontSize: 11, py: 0.5 }}>vs período anterior</ToggleButton>
          <ToggleButton value="prom3" sx={{ fontSize: 11, py: 0.5 }}>vs prom. 3 períodos</ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell>Cuenta contable</TableCell>
              <TableCell align="right">Este período</TableCell>
              <TableCell align="right">{modo === 'anterior' ? 'Anterior' : 'Prom. 3'}</TableCell>
              <TableCell align="right">Δ $</TableCell>
              <TableCell align="center">Δ %</TableCell>
              <TableCell>Últimos 6</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((f) => {
              const revisar = f.variacion !== null && f.variacion >= 25;
              return (
                <TableRow key={f.cuentaContable}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: colorCategoria(f.categoria), flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{humanizar(f.cuentaContable)}</Typography>
                      {revisar && <Pildora color={COLOR.rojo} bg="transparent" sx={{ fontSize: 9, border: `1px solid ${COLOR.rojo}`, px: 0.75, py: 0 }}>REVISAR</Pildora>}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{clp(f.actual)}</TableCell>
                  <TableCell align="right" sx={{ color: '#6B6558' }}>{clp(f.base)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, color: f.delta === 0 ? COLOR.muted : f.delta > 0 ? COLOR.rojo : COLOR.verde, fontWeight: 600 }}>
                    {f.delta === 0 ? '—' : `${f.delta > 0 ? '+' : '−'}${clp(Math.abs(f.delta))}`}
                  </TableCell>
                  <TableCell align="center">
                    {f.variacion === null ? <Box component="span" sx={{ color: COLOR.muted }}>nuevo</Box> : (
                      <Pildora
                        color={Math.abs(f.variacion) < 0.05 ? COLOR.muted : revisar ? '#fff' : f.variacion > 0 ? COLOR.rojo : COLOR.verde}
                        bg={Math.abs(f.variacion) < 0.05 ? '#F1EDE5' : revisar ? COLOR.rojo : f.variacion > 0 ? '#FBE3E3' : '#E1EFE6'}
                      >
                        {Math.abs(f.variacion) < 0.05 ? '= 0%' : `${f.variacion > 0 ? '+' : '−'}${pct(Math.abs(f.variacion))}`}
                      </Pildora>
                    )}
                  </TableCell>
                  <TableCell><BarrasMini valores={f.serie} /></TableCell>
                </TableRow>
              );
            })}
            {filas.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ color: COLOR.muted, py: 4 }}>Sin gastos en el período.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1.75, fontSize: 11, color: COLOR.muted }}>
          {[['gasto_de_producción', 'Producción'], ['gasto_de_producción_indirecto', 'Indirecto'], ['gastos_de_administración_y_ventas', 'Admin. y ventas']].map(([k, n]) => (
            <Box key={k} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: colorCategoria(k) }} />{n}
            </Box>
          ))}
        </Box>
        {filas.length > 8 && (
          <Button size="small" onClick={() => setVerTodas(!verTodas)}>{verTodas ? 'Ver menos' : `Ver las ${filas.length} cuentas`}</Button>
        )}
      </Box>
      <Typography sx={{ fontSize: 11, color: COLOR.muted, mt: 0.5 }}>
        Barra roja = período actual · REVISAR = la cuenta sube 25% o más
      </Typography>
    </Tarjeta>
  );
}

function TopItems({ d }) {
  const top = d.topItems.slice(0, 5);
  const max = top[0] ? top[0].total : 1;
  return (
    <Tarjeta titulo="Top ítems" subtitulo="Ítems con mayor gasto acumulado">
      {top.length === 0 && <Typography variant="body2" color="text.secondary">Sin datos.</Typography>}
      {top.map((it) => (
        <Box key={it.item} sx={{ minHeight: 44 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              {it.item} <Box component="span" sx={{ fontSize: 11, color: COLOR.muted, fontWeight: 500 }}>· {it.n} {it.n === 1 ? 'compra' : 'compras'}</Box>
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {clp(it.total)} <Box component="span" sx={{ fontSize: 11, color: COLOR.muted, fontWeight: 600 }}>· {pct(it.porcentaje)}</Box>
            </Typography>
          </Box>
          <Box sx={{ mt: 0.75 }}><Barra valor={(it.total / max) * 100} color="#4A4238" alto={6} /></Box>
        </Box>
      ))}
    </Tarjeta>
  );
}

function MayoresVariaciones({ d, modo }) {
  const filas = filasCuentas(d.cuentas, modo).filter((f) => f.variacion !== null && Math.abs(f.delta) >= d.total * 0.005);
  const sube = filas.filter((f) => f.variacion > 0).sort((a, b) => b.variacion - a.variacion).slice(0, 3);
  const baja = filas.filter((f) => f.variacion < 0).sort((a, b) => a.variacion - b.variacion).slice(0, 1);
  const lista = [...sube, ...baja];
  return (
    <Tarjeta titulo="Mayores variaciones" subtitulo="Cuentas que más subieron y la que más bajó">
      {lista.length === 0 && <Typography variant="body2" color="text.secondary">Sin variaciones relevantes.</Typography>}
      {lista.map((f) => (
        <Box key={f.cuentaContable} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 34, borderTop: '1px solid #F1EDE5', fontSize: 13 }}>
          <Box component="span" sx={{ color: f.variacion > 0 ? COLOR.rojo : COLOR.verde, fontSize: 11 }}>{f.variacion > 0 ? '▲' : '▼'}</Box>
          <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{humanizar(f.cuentaContable)}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: f.variacion > 0 ? COLOR.rojo : COLOR.verde }}>
            {f.variacion > 0 ? '+' : '−'}{pct(Math.abs(f.variacion))}
          </Typography>
          <Typography sx={{ fontSize: 12, color: COLOR.muted, width: 84, textAlign: 'right' }}>
            {f.delta > 0 ? '+' : '−'}{clp(Math.abs(f.delta))}
          </Typography>
        </Box>
      ))}
    </Tarjeta>
  );
}

export default function ResumenVista({ datos, onVerLocales }) {
  const [modo, setModo] = useState('anterior');
  const [verTodas, setVerTodas] = useState(false);
  const d = datos;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Kpis d={d} />
      <Box sx={grilla('1.55fr 1fr')}>
        <GraficoDiario d={d} />
        <Ranking d={d} onVerLocales={onVerLocales} />
      </Box>
      <Box sx={grilla('repeat(3, 1fr)')}>
        <Composicion d={d} />
        <Dona d={d} />
        <Marcas d={d} />
      </Box>
      <Box sx={grilla('1.75fr 1fr')}>
        <Cuentas d={d} modo={modo} setModo={setModo} verTodas={verTodas} setVerTodas={setVerTodas} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TopItems d={d} />
          <MayoresVariaciones d={d} modo={modo} />
        </Box>
      </Box>
    </Box>
  );
}

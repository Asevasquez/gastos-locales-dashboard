import React from 'react';
import { Box, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { COLOR, Pildora, Tarjeta, clp, pct } from './comunes';
import { diaMesCorto, formatearFechaGasto } from '../../utils/fechas';

function KpiAlerta({ etiqueta, valor, sub, color }) {
  return (
    <Tarjeta>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: color }} />
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLOR.muted }}>{etiqueta}</Typography>
      </Box>
      <Typography sx={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, mt: 1, color: color === '#6B6558' ? COLOR.ink : color }}>{valor}</Typography>
      <Typography sx={{ fontSize: 12, color: '#6B6558', mt: 0.75, lineHeight: 1.4 }}>{sub}</Typography>
    </Tarjeta>
  );
}

function resumenNombres(lista) {
  const nombres = lista.map((x) => x.nombre);
  if (nombres.length === 0) return 'Todos los locales registraron gastos';
  if (nombres.length <= 2) return nombres.join(' y ');
  return `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más`;
}

function Atipicos({ d, onVerBoleta }) {
  return (
    <Tarjeta
      titulo="Gastos atípicos"
      subtitulo="Monto muy por encima de lo habitual para ese ítem — revisa la boleta y el motivo"
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Ítem</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>vs promedio del ítem</TableCell>
              <TableCell align="center">Boleta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {d.atipicos.map((a) => (
              <TableRow key={a.gastoId}>
                <TableCell>{formatearFechaGasto(a.fecha)}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{a.local.nombre}</TableCell>
                <TableCell>{a.item}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{clp(a.monto)}</TableCell>
                <TableCell>
                  <Pildora color={COLOR.ambar} bg="#F8EEDB">{String(a.veces).replace('.', ',')}×</Pildora>{' '}
                  <Box component="span" sx={{ fontSize: 11, color: COLOR.muted }}>prom. {clp(a.promedio)}</Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onVerBoleta && onVerBoleta(a.fotoBoletaUrl)} disabled={!a.fotoBoletaUrl} aria-label="Ver boleta">
                    <ReceiptIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {d.atipicos.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ color: COLOR.muted, py: 4 }}>No hay gastos atípicos en este período.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <Typography sx={{ fontSize: 12, color: COLOR.muted, mt: 1.5 }}>
        Se marca como atípico un gasto de {String(d.umbrales.atipicoVeces).replace('.', ',')}× o más el promedio del mismo ítem en los últimos {d.umbrales.historialDias} días
        (solo ítems con al menos {d.umbrales.atipicoMinCompras} compras).
        {d.totalAtipicos > d.atipicos.length && ` Mostrando ${d.atipicos.length} de ${d.totalAtipicos}.`}
      </Typography>
    </Tarjeta>
  );
}

function SinActividad({ d }) {
  return (
    <Tarjeta titulo="Sin actividad reciente" subtitulo={`Locales que no registran gastos hace ${d.umbrales.sinActividadDias} días o más`}>
      {d.sinActividad.length === 0 && <Typography variant="body2" color="text.secondary">Todos los locales registraron gastos recientemente.</Typography>}
      {d.sinActividad.map((x) => {
        const critico = x.dias === null || x.dias >= 14;
        return (
          <Box key={x.local._id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 56, borderTop: '1px solid #F1EDE5' }}>
            <Box sx={{ width: 9, height: 9, borderRadius: 999, bgcolor: critico ? COLOR.rojo : COLOR.ambar, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{x.local.nombre}</Typography>
              <Typography sx={{ fontSize: 12, color: COLOR.muted }}>
                {x.ultimo === null ? 'Nunca ha registrado gastos' : `Último registro: ${diaMesCorto(x.ultimo)} (hace ${x.dias} días)`}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Tarjeta>
  );
}

function Precios({ d }) {
  return (
    <Tarjeta
      titulo="Precio unitario del mismo ítem entre locales"
      subtitulo="Monto ÷ cantidad, solo compras con la misma unidad"
      derecha={
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: COLOR.muted }}>AHORRO POTENCIAL ESTIMADO</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: COLOR.verde }}>{clp(d.ahorroPotencial)}</Typography>
        </Box>
      }
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow>
              <TableCell>Ítem</TableCell>
              <TableCell>Un.</TableCell>
              <TableCell>Compra más barata</TableCell>
              <TableCell>Compra más cara</TableCell>
              <TableCell align="right">Brecha</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {d.precios.map((p) => (
              <TableRow key={`${p.item}|${p.unidad}`}>
                <TableCell sx={{ fontWeight: 600 }}>{p.item}</TableCell>
                <TableCell sx={{ color: COLOR.muted }}>{p.unidad.toLowerCase()}</TableCell>
                <TableCell>
                  <b style={{ color: COLOR.verde }}>{clp(p.minimo.precio)}</b>
                  <Typography sx={{ fontSize: 11, color: COLOR.muted }}>{p.minimo.local.nombre}</Typography>
                </TableCell>
                <TableCell>
                  <b style={{ color: COLOR.rojo }}>{clp(p.maximo.precio)}</b>
                  <Typography sx={{ fontSize: 11, color: COLOR.muted }}>{p.maximo.local.nombre}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: COLOR.rojo }}>+{pct(p.brechaPct, 0)}</TableCell>
              </TableRow>
            ))}
            {d.precios.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ color: COLOR.muted, py: 4 }}>No hay ítems comprados en más de un local con la misma unidad.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <Typography sx={{ fontSize: 12, color: COLOR.muted, mt: 1.5 }}>
        Ahorro potencial = si cada compra por sobre el precio promedio del ítem se hubiera hecho al promedio.
      </Typography>
    </Tarjeta>
  );
}

function EfectivoPorLocal({ d }) {
  const umbral = d.umbrales.efectivoPct;
  return (
    <Tarjeta titulo="% de gasto en efectivo por local" subtitulo="Efectivo + efectivo flujo sobre el total del local">
      {d.efectivoPorLocal.length === 0 && <Typography variant="body2" color="text.secondary">Sin gastos en el período.</Typography>}
      {d.efectivoPorLocal.length > 0 && (
        <Box sx={{ position: 'relative', mt: 3, pr: 5 }}>
          <Box sx={{ position: 'absolute', left: `calc(170px + (100% - 170px - 40px) * ${umbral / 100})`, top: -6, bottom: 0, borderLeft: `1.5px dashed ${COLOR.ink}` }} />
          <Typography sx={{ position: 'absolute', left: `calc(170px + (100% - 170px - 40px) * ${umbral / 100} - 34px)`, top: -22, fontSize: 10, fontWeight: 700 }}>
            Umbral {umbral}%
          </Typography>
          {d.efectivoPorLocal.map((x) => {
            const alerta = x.pct > umbral;
            return (
              <Box key={x.local._id} sx={{ display: 'flex', alignItems: 'center', minHeight: 32 }}>
                <Typography sx={{ width: 170, flexShrink: 0, fontSize: 12, fontWeight: 600, pr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.local.nombre}</Typography>
                <Box sx={{ flex: 1, height: 10, bgcolor: COLOR.pista, borderRadius: 999 }}>
                  <Box sx={{ width: `${Math.min(100, x.pct)}%`, height: 10, borderRadius: 999, bgcolor: alerta ? COLOR.rojo : '#8A8476' }} />
                </Box>
                <Typography sx={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 700, color: alerta ? COLOR.rojo : COLOR.ink }}>{pct(x.pct, 0)}</Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Tarjeta>
  );
}

export default function ControlVista({ datos, onVerBoleta }) {
  const d = datos;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
        <KpiAlerta etiqueta="Locales sin registro" valor={d.sinRegistro.length} sub={resumenNombres(d.sinRegistro)} color={d.sinRegistro.length ? COLOR.rojo : COLOR.verde} />
        <KpiAlerta etiqueta="Gastos atípicos" valor={d.totalAtipicos} sub={`Montos sobre ${String(d.umbrales.atipicoVeces).replace('.', ',')}× el promedio del mismo ítem`} color={d.totalAtipicos ? COLOR.ambar : COLOR.verde} />
        <KpiAlerta etiqueta="Motivos muy cortos" valor={d.motivosCortos} sub={`${pct(d.motivosCortosPct)} de los gastos · menos de ${d.umbrales.motivoCortoLargo} caracteres`} color={d.motivosCortos ? COLOR.ambar : COLOR.verde} />
        <KpiAlerta etiqueta="Gastos editados" valor={d.editados} sub={`${pct(d.editadosPct)} se modificaron después de registrarse`} color="#6B6558" />
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' } }}>
        <Atipicos d={d} onVerBoleta={onVerBoleta} />
        <SinActividad d={d} />
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' } }}>
        <Precios d={d} />
        <EfectivoPorLocal d={d} />
      </Box>
    </Box>
  );
}

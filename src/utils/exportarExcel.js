import * as XLSX from 'xlsx';
import { MESES_ES, formatearFechaGasto } from './fechas';

const ETIQUETA_MEDIO_PAGO = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO_FLUJO: 'Efectivo flujo'
};

// Exporta en el formato de la planilla de referencia: ID LOCAL, NOMBRE LOCAL, FECHA, ITEM, DETALLE
// (cantidad + unidad - motivo, ej. "5 KG - Se acabó el arroz"), MONTO, ESTATUS, ESTE MES, ITEM (= cuenta
// contable en mayúsculas), RATIO, CUENTA CONTABLE, MES, MEDIO DE PAGO. ESTATUS/ESTE MES quedan en blanco:
// no hay con qué llenarlas de forma confiable desde el sistema. ID LOCAL es el "Código externo" del
// local (se edita en la pantalla Locales); queda vacío para los locales que no tengan uno cargado.
export function exportarGastosExcel(gastos, nombreArchivo) {
  const filas = gastos.map((g) => {
    const fecha = new Date(g.fecha);
    return {
      'ID LOCAL': g.local?.codigoExterno || '',
      'NOMBRE LOCAL': g.local?.nombre || '',
      FECHA: formatearFechaGasto(g.fecha),
      ITEM: g.productoNombre,
      DETALLE: `${g.cantidad} ${g.unidadMedida} - ${g.motivo}`,
      MONTO: g.monto,
      ESTATUS: '',
      'ESTE MES': '',
      ITEM_2: g.cuentaContable?.toUpperCase() || '',
      RATIO: g.categoria,
      'CUENTA CONTABLE': g.cuentaContable,
      MES: MESES_ES[fecha.getUTCMonth()],
      'MEDIO DE PAGO': ETIQUETA_MEDIO_PAGO[g.medioPago] || g.medioPago
    };
  });

  const hoja = XLSX.utils.json_to_sheet(filas);
  // json_to_sheet no permite dos columnas "ITEM" con la misma clave: se renombra la segunda
  // acá para que el encabezado final quede igual al de la planilla.
  const rango = XLSX.utils.decode_range(hoja['!ref']);
  for (let col = rango.s.c; col <= rango.e.c; col += 1) {
    const celda = hoja[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (celda && celda.v === 'ITEM_2') celda.v = 'ITEM';
  }

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Gastos');
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

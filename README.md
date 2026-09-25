# Gastos de Locales — Dashboard

Dashboard React/Vite/MUI para analistas y master: revisión de gastos, estadísticas,
desglose por cuenta contable, carga del catálogo de ítems (Excel), y administración
de locales/usuarios (solo MASTER).

## Setup

```bash
npm install
cp .env.example .env   # completar VITE_API_URL con la URL del backend
npm run dev
```

## Estructura

- `src/pages/GastosPage.jsx` — pantalla principal: toggle Mes/Semana (la semana se
  calcula de lunes a domingo a partir de cualquier día que elijas), filtro de local,
  filtro de medio de pago, tarjetas resumen, tabla de últimos gastos (con Cuenta
  Contable y Medio de Pago), gasto por categoría, locales sin registrar, gasto por
  cuenta contable, y exportación a Excel en el formato exacto que usa la planilla de
  referencia (columnas FECHA, COL1, ITEM, MONTO, ESTATUS, ESTE MES, ITEM, RATIO,
  CUENTA CONTABLE, MES, MEDIO DE PAGO — las tres columnas sin equivalente en el
  sistema, COL1/ESTATUS/ESTE MES, quedan en blanco).
- `src/pages/CatalogoPage.jsx` — MASTER sube el Excel del catálogo (ITEM, DETALLE
  opcional, RATIO, CUENTA CONTABLE); reemplaza lo que antes era la sincronización
  con Bsale.
- `src/pages/LocalesPage.jsx` / `UsuariosPage.jsx` — CRUD completo, solo MASTER.
- `src/components/Layout.jsx` — sidebar, ítems de nav filtrados por rol.

## Ver la boleta/factura

En la tabla de "Últimos gastos" cada fila tiene un ícono de recibo que abre un modal
con la imagen completa (`fotoBoletaUrl`).

## Pendiente

- **Seguridad de `/uploads`**: las fotos de boletas siguen siendo estáticas y públicas
  por URL (nombre de archivo no adivinable, pero sin requerir sesión para verlo).
- **COL1 / ESTATUS / ESTE MES** en la exportación: quedan en blanco porque no está
  claro qué debían contener en la planilla de referencia — si tienen un propósito
  específico (fórmulas, estado de conciliación, etc.), hay que definirlo y agregarlo.

import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx/xlsx.mjs";
import {
  buscarCoincidencia,
  formatearFechaImportacion,
  leerExcel,
  normalizarFilasExcel,
  normalizarMonedaImportacion,
  numeroImportacion,
  resolverFechaImportacion,
  validarFilaImportacion,
} from "../src/functions/importaciones/importarOperacionesExcel.js";

const hoy = new Date(2026, 8, 9, 0, 1);
const data = {
  productos: [
    { id: "P1", descripcion: "Funko Pop Goku", costo: 999, precio: 999 },
    { id: "P2", descripcion: "VEGETA SSJ" },
    { id: "P3", descripcion: "VEGETA BLUE" },
    { id: "P4", descripcion: "Depredador Samurai NECA X2" },
    { id: "P5", descripcion: "Vegeta + Androide 18" },
  ],
  canalesVentas: [
    { id: "CV-A0000", nombre: "General", estado: true },
    { id: "CV-A0004", nombre: "Otros", estado: true },
    { id: "C1", nombre: "Efectivo", estado: true },
    { id: "C2", nombre: "Inactivo", estado: false },
  ],
  clientes: [{ id: "CL-A0000", nombre: "Consumidor Final" }],
  proveedores: [{ id: "PV-A0001", nombre: "Proveedor General" }],
  sucursales: [{ id: "SC-A0001", nombre: "Central" }],
};
const original = {
  filaExcel: 2, producto: "Funko Pop Goku", precio: 218000, costo: 159000, fecha: "2-ago",
};
const normalizar = (fila = {}, collection = "ventas", catalogos = data) =>
  normalizarFilasExcel([{ ...original, ...fila }], collection, catalogos, { hoy })[0];

function archivoExcel(matriz, { bookType = "xlsx", segundaHoja, origen = "A1", date1904 = false } = {}) {
  const workbook = XLSX.utils.book_new();
  const hoja = {};
  // El escritor de xlsx 0.18.5 arrastra segundos históricos del timezone
  // al serializar Date. La fixture usa el serial de calendario propio de Excel.
  const celdas = matriz.map((fila) => fila.map((valor) => valor instanceof Date
    ? { t: "n", v: (Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate()) - Date.UTC(1899, 11, 30)) / 86400000, z: "dd/mm/yyyy" }
    : valor));
  XLSX.utils.sheet_add_aoa(hoja, celdas, { origin: origen });
  XLSX.utils.book_append_sheet(workbook, hoja, "Primera");
  if (segundaHoja) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(segundaHoja), "Segunda");
  workbook.Workbook = { WBProps: { date1904 } };
  const buffer = XLSX.write(workbook, { type: "array", bookType });
  return { name: "operaciones." + (bookType === "biff8" ? "xls" : "xlsx"), size: buffer.byteLength, arrayBuffer: async () => buffer };
}

test("fechas sin año usan hoy por calendario, sin comparar horas", () => {
  for (const [entrada, esperada] of [
    ["2-ago", "02/08/2026"], ["02-ago", "02/08/2026"], ["2/ago", "02/08/2026"],
    ["25-nov", "25/11/2025"], ["09/09", "09/09/2026"], ["15/01", "15/01/2026"],
    ["2 agosto", "02/08/2026"], ["01-septiembre", "01/09/2026"],
  ]) assert.equal(formatearFechaImportacion(resolverFechaImportacion(entrada, hoy)), esperada);
  assert.equal(formatearFechaImportacion(resolverFechaImportacion("25-nov", new Date(2030, 8, 9))), "25/11/2029");
});

test("fechas explícitas, ISO local y Date conservan año, incluso futuro", () => {
  for (const entrada of ["25/11/2028", "25-11-28", "2028-11-25", new Date(2028, 10, 25, 23)]) {
    const fecha = resolverFechaImportacion(entrada, hoy);
    assert.equal(formatearFechaImportacion(fecha), "25/11/2028");
    assert.equal(fecha.getHours(), 0);
  }
});

test("fechas imposibles no se desplazan al mes siguiente", () => {
  for (const entrada of ["31/02/2026", "29/02/2025", "32/01", "2-otro", "", null, new Date(NaN), 60]) {
    assert.equal(resolverFechaImportacion(entrada, hoy), null);
  }
  assert.equal(formatearFechaImportacion(resolverFechaImportacion("29/02/2024", hoy)), "29/02/2024");
});

test("seriales Excel respetan calendarios 1900 y 1904 sin UTC", () => {
  assert.equal(formatearFechaImportacion(resolverFechaImportacion(1462, hoy)), "01/01/1904");
  assert.equal(formatearFechaImportacion(resolverFechaImportacion(0, hoy, true)), "01/01/1904");
  assert.equal(formatearFechaImportacion(resolverFechaImportacion(1462.9, hoy)), "01/01/1904");
});

test("cantidad default 1, cero inválido y ninguna inferencia desde X2", () => {
  for (const cantidad of [undefined, null, "", " "]) assert.equal(normalizar({ cantidad }).cantidad, 1);
  assert.ok(normalizar({ cantidad: 0 }).errores.some((error) => error.includes("cantidad")));
  assert.equal(normalizar({ producto: "Depredador Samurai NECA X2" }).cantidad, 1);
});

test("normaliza aliases ARS/USD y conserva desconocidos inválidos", () => {
  for (const moneda of [undefined, "", "$", "PESO", "PESOS", "Pesos argentinos", "ARS"]) {
    assert.equal(normalizarMonedaImportacion(moneda), "ARS");
  }
  for (const moneda of ["USD", "U$S", "US$", "dólar", "DÓLARES"]) {
    assert.equal(normalizarMonedaImportacion(moneda), "USD");
  }
  assert.equal(normalizarMonedaImportacion("EUR"), "EUR");
  assert.ok(normalizar({ moneda: "EUR" }).errores.some((error) => error.includes("moneda")));
});

test("matching exacto normalizado, ambiguos y aproximados quedan sin seleccionar", () => {
  assert.equal(buscarCoincidencia(" FÚNKO   POP-GOKU ", data.productos), "P1");
  assert.equal(buscarCoincidencia("VEGETA", data.productos), "");
  assert.equal(buscarCoincidencia("Goku", data.productos), "");
  assert.equal(buscarCoincidencia("Funko Pop Goku", [...data.productos, { id: "Duplicado", descripcion: "FUNKO POP GOKU" }]), "");
});

test("no divide descripciones ni agrupa filas repetidas", () => {
  const filas = normalizarFilasExcel([
    { ...original, filaExcel: 2, producto: "Vegeta + Androide 18" },
    { ...original, filaExcel: 3, producto: "Vegeta + Androide 18" },
    { ...original, filaExcel: 4, producto: "A / B, C x2" },
  ], "ventas", data, { hoy });
  assert.equal(filas.length, 3);
  assert.deepEqual(filas.map((fila) => fila.filaExcel), [2, 3, 4]);
  assert.equal(filas[0].productoId, "P5");
  assert.equal(filas[2].productoOriginal, "A / B, C x2");
  assert.equal(filas[2].cantidad, 1);
});

test("canal vacío usa Otros activo, desconocido/inactivo/general no", () => {
  assert.equal(normalizar().canalId, "CV-A0004");
  assert.equal(normalizar({ canal: "EFÉCTIVO" }).canalId, "C1");
  for (const canal of ["Mercado Pago", "Inactivo", "General"]) {
    const fila = normalizar({ canal });
    assert.equal(fila.canalId, "");
    assert.equal(fila.canalOriginal, canal);
    assert.ok(fila.errores.some((error) => error.includes("canal")));
  }
  assert.equal(normalizar({}, "ventas", { ...data, canalesVentas: [] }).canalId, "");
});

test("defaults requieren ID existente y no pisan nombres desconocidos", () => {
  assert.equal(normalizar().clienteId, "CL-A0000");
  assert.equal(normalizar().sucursalId, "SC-A0001");
  assert.equal(normalizar({}, "compras").proveedorId, "PV-A0001");
  assert.equal(normalizar({ cliente: "Juan Perez" }).clienteId, "");
  assert.equal(normalizar({ proveedor: "No existe" }, "compras").proveedorId, "");
  assert.equal(normalizar({ sucursal: "No existe" }).sucursalId, "");
  assert.equal(normalizar({ sucursal: "CÉNTRAL" }).sucursalId, "SC-A0001");
  assert.equal(normalizar({}, "ventas", { ...data, clientes: [], sucursales: [] }).clienteId, "");
  assert.equal(normalizar({}, "ventas", { ...data, clientes: [], sucursales: [] }).sucursalId, "");
});

test("importes históricos autoritativos, faltantes/negativos inválidos y cero válido", () => {
  const fila = normalizar();
  assert.equal(fila.precio, 218000);
  assert.equal(fila.costo, 159000);
  assert.deepEqual(fila.errores, []);
  for (const valor of [undefined, "", "mal", -1, Infinity]) {
    assert.ok(normalizar({ costo: valor }).errores.some((error) => error.includes("costo")));
    assert.ok(normalizar({ precio: valor }).errores.some((error) => error.includes("venta")));
  }
  assert.deepEqual(normalizar({ costo: 0, precio: 0 }).errores, []);
});

test("números de Excel y texto argentino conservan importes y rechazan basura", () => {
  assert.equal(numeroImportacion(1234.56), 1234.56);
  assert.equal(numeroImportacion("$ 1.234,56"), 1234.56);
  assert.equal(numeroImportacion("1234.56"), 1234.56);
  assert.equal(numeroImportacion("218.000"), 218000);
  assert.ok(Number.isNaN(numeroImportacion("123abc")));
  assert.ok(Number.isNaN(numeroImportacion(null)));
});

test("ganancia discrepante advierte sin invalidar y corregir limpia errores", () => {
  const fila = normalizar({ ganancia: 10 });
  assert.deepEqual(fila.errores, []);
  assert.equal(fila.advertencias.length, 1);
  const invalida = normalizar({ producto: "Desconocido", costo: "" });
  const corregida = validarFilaImportacion({ ...invalida, productoId: "P1", costo: 10 }, "ventas", data);
  assert.deepEqual(corregida.errores, []);
  assert.ok(invalida.errores.length > 0);
});

for (const bookType of ["xlsx", "biff8"]) {
  test("lee " + bookType + ": aliases, primera hoja y números reales con filas vacías", async () => {
    const resultado = await leerExcel(archivoExcel([
      [" ARTÍCULO ", "PRECIO-DE-VENTA", "COSTE", "FECHA", "MEDIO DE PAGO"],
      ["Funko Pop Goku", 218000, 159000, "2-ago", "Efectivo"],
      [],
      ["Funko Pop Goku", 100, 50, "25-nov", ""],
    ], { bookType, segundaHoja: [["Otra"], ["No importar"]] }), "ventas");
    assert.deepEqual(resultado.filas.map((fila) => fila.filaExcel), [2, 4]);
    assert.equal(resultado.filas[0].precio, 218000);
    assert.equal(resultado.filas.length, 2);
  });
}

test("encabezados desplazados conservan la posición de Excel", async () => {
  const resultado = await leerExcel(archivoExcel([
    ["PRODUCTO", "PRECIO DE COMPRA", "FECHA"],
    ["Funko Pop Goku", 10, "2-ago"],
  ], { origen: "B3" }), "compras");
  assert.equal(resultado.filas[0].filaExcel, 4);
  assert.equal(resultado.filas[0].costo, 10);
});

test("fechas reales y calendario 1904 se normalizan desde workbook", async () => {
  const resultado = await leerExcel(archivoExcel([
    ["PRODUCTO", "COSTO", "FECHA"], ["Funko Pop Goku", 10, new Date(2026, 7, 2)],
  ]), "compras");
  assert.equal(normalizarFilasExcel(resultado.filas, "compras", data)[0].fechaTexto, "02/08/2026");
  const historico = await leerExcel(archivoExcel([
    ["PRODUCTO", "COSTO", "FECHA"], ["Funko Pop Goku", 10, 0],
  ], { date1904: true }), "compras");
  assert.equal(normalizarFilasExcel(historico.filas, "compras", data, historico)[0].fechaTexto, "01/01/1904");
});

test("rechaza extensión, archivo vacío, falsos Excel, hoja vacía y encabezados inválidos", async () => {
  await assert.rejects(leerExcel({ name: "datos.csv", size: 1 }, "ventas"), /extensión/);
  await assert.rejects(leerExcel({ name: "datos.xlsx", size: 0 }, "ventas"), /vacío/);
  await assert.rejects(leerExcel({ name: "datos.xlsx", size: 1, arrayBuffer: async () => new Uint8Array([1]).buffer }, "ventas"), /formato Excel/);
  await assert.rejects(leerExcel(archivoExcel([]), "compras"), /vacía/);
  await assert.rejects(leerExcel(archivoExcel([["Algo"], ["Dato"]]), "compras"), /columnas requeridas/);
  await assert.rejects(leerExcel(archivoExcel([["Producto", "Costo", "Fecha"]]), "compras"), /filas de datos/);
  await assert.rejects(leerExcel(archivoExcel([["Producto", "Costo", "Precio", "Fecha"], ["A", 1, 2, "2-ago"]]), "compras"), /más de una columna/);
  await assert.rejects(leerExcel(archivoExcel([]), "stock"), /Solo se pueden/);
});

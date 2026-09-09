import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx/xlsx.mjs";
import {
  buscarCoincidencia,
  construirOperacionImportada,
  obtenerMensajeErrorImportacion,
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

const contextoGuardado = {
  usuario: "US-A0005",
  valorDolar: 1400,
  sucursalesDisponibles: ["SC-A0001"],
};

test("payload de venta ARS conserva importes históricos y Date del preview", () => {
  const fila = normalizar();
  const antes = structuredClone(fila);
  const payload = construirOperacionImportada({ fila, collection: "ventas", ...contextoGuardado });
  assert.deepEqual(payload.data, {
    sucursal: "SC-A0001", cliente: "CL-A0000", canal: "CV-A0004",
    moneda: "ARS", valorDivisa: 1, estado: "COMPLETADA", descuento: 0,
  });
  assert.equal(payload.collection, "ventas");
  assert.equal(payload.detailCollection, "detalleVentas");
  assert.equal(payload.detailRef, "venta");
  assert.deepEqual(payload.detalleNuevo, [{
    idProducto: "P1", cantidad: 1, precio: 218000, costo: 159000, monedaCosto: "ARS",
  }]);
  assert.equal(payload.fechaOperacion, fila.fecha);
  assert.equal(payload.usarCostoDetalle, true);
  assert.equal(payload.permitirNegativo, false);
  assert.equal(payload.usuario, "US-A0005");
  assert.equal(payload.valorDolar, 1400);
  assert.deepEqual(payload.sucursalesDisponibles, ["SC-A0001"]);
  assert.deepEqual(payload.detalleOriginal, []);
  assert.equal("idElemento" in payload, false);
  assert.equal("fecha" in payload.data, false);
  assert.equal("gananciaExcel" in payload.detalleNuevo[0], false);
  assert.deepEqual(fila, antes);
});

test("payload de compra usa costo Excel como precio y no agrega snapshot de venta", () => {
  const fila = normalizar({ cantidad: 3, costo: 500 }, "compras");
  const payload = construirOperacionImportada({ fila, collection: "compras", ...contextoGuardado });
  assert.deepEqual(payload.data, {
    sucursal: "SC-A0001", proveedor: "PV-A0001",
    moneda: "ARS", valorDivisa: 1, estado: "COMPLETADA", descuento: 0,
  });
  assert.equal(payload.collection, "compras");
  assert.equal(payload.detailCollection, "detalleCompras");
  assert.equal(payload.detailRef, "compra");
  assert.deepEqual(payload.detalleNuevo, [{ idProducto: "P1", cantidad: 3, precio: 500 }]);
  assert.equal(payload.usarCostoDetalle, false);
  assert.equal(payload.permitirNegativo, false);
  assert.equal(payload.fechaOperacion, fila.fecha);
});

test("USD usa cotización de la importación para operación y costo histórico de venta", () => {
  const fila = normalizar({ moneda: "USD", precio: 150, costo: 100 });
  const payload = construirOperacionImportada({ fila, collection: "ventas", ...contextoGuardado });
  assert.equal(payload.data.valorDivisa, 1400);
  assert.equal(payload.detalleNuevo[0].valorDivisaCosto, 1400);
  assert.equal(payload.detalleNuevo[0].monedaCosto, "USD");
  assert.equal(payload.detalleNuevo[0].precio, 150);
  assert.equal(payload.detalleNuevo[0].costo, 100);
});

test("cotización explícita válida tiene prioridad para USD; ARS siempre usa uno", () => {
  for (const collection of ["ventas", "compras"]) {
    const fila = { ...normalizar({ moneda: "USD" }, collection), valorDivisa: 1200 };
    const payload = construirOperacionImportada({ fila, collection, ...contextoGuardado });
    assert.equal(payload.data.valorDivisa, 1200);
    assert.equal(payload.valorDolar, 1400);
    if (collection === "ventas") assert.equal(payload.detalleNuevo[0].valorDivisaCosto, 1200);
    const ars = construirOperacionImportada({ fila: { ...fila, moneda: "ARS" }, collection, ...contextoGuardado });
    assert.equal(ars.data.valorDivisa, 1);
  }
});

test("cotización explícita inválida usa el servicio, nunca inventa un valor", () => {
  for (const valorDivisa of [undefined, null, 0, -1, 1, NaN, Infinity]) {
    const payload = construirOperacionImportada({
      fila: { ...normalizar({ moneda: "USD" }), valorDivisa }, collection: "ventas", ...contextoGuardado,
    });
    assert.equal(payload.data.valorDivisa, 1400);
  }
  assert.throws(() => construirOperacionImportada({
    fila: normalizar({ moneda: "USD" }), collection: "ventas", ...contextoGuardado, valorDolar: 1,
  }), /cotización USD/);
});

test("payload rechaza usuario UID, cotización inválida y costos faltantes sin fallback al producto", () => {
  const base = { fila: normalizar(), collection: "ventas", ...contextoGuardado };
  for (const usuario of [undefined, "", "firebaseUid", "US-123"]) {
    assert.throws(() => construirOperacionImportada({ ...base, usuario }), /usuario interno/);
  }
  for (const valorDolar of [null, 0, -1, NaN, Infinity]) {
    assert.throws(() => construirOperacionImportada({ ...base, valorDolar }), /cotización oficial/);
  }
  for (const costo of [undefined, null, NaN, -1, Infinity]) {
    assert.throws(() => construirOperacionImportada({ ...base, fila: { ...base.fila, costo } }), /importes históricos/);
  }
  assert.throws(() => construirOperacionImportada({ ...base, collection: "stock" }), /Solo se pueden/);
});

test("dos filas repetidas producen dos payloads nuevos de un detalle, en orden del preview", () => {
  const filas = normalizarFilasExcel([
    { ...original, filaExcel: 2, fecha: "10/08/2026" },
    { ...original, filaExcel: 5, fecha: "01/08/2026" },
  ], "ventas", data);
  const payloads = filas.map((fila) => construirOperacionImportada({ fila, collection: "ventas", ...contextoGuardado }));
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].detalleNuevo.length, 1);
  assert.equal(payloads[1].detalleNuevo.length, 1);
  assert.notEqual(payloads[0], payloads[1]);
  assert.equal(payloads[0].fechaOperacion.getDate(), 10);
  assert.equal(payloads[1].fechaOperacion.getDate(), 1);
});

test("mensajes de error conservan motivo, sin stack ni objeto Firebase", () => {
  assert.equal(obtenerMensajeErrorImportacion(new Error("Stock insuficiente.")), "Stock insuficiente.");
  assert.equal(obtenerMensajeErrorImportacion({ message: "permission-denied\nstack interno", stack: "secreto" }), "permission-denied");
  assert.equal(obtenerMensajeErrorImportacion({ message: "x".repeat(2000) }).length, 1000);
  for (const error of [undefined, null, {}, { message: "" }, { message: {} }]) {
    assert.equal(obtenerMensajeErrorImportacion(error), "Error desconocido al guardar la operación.");
  }
});

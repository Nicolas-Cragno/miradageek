import * as XLSX from "xlsx/xlsx.mjs";

const vacio = (valor) => valor == null || (typeof valor === "string" && !valor.trim());
const texto = (valor) => vacio(valor) ? "" : String(valor).trim();

export const normalizarTexto = (valor) => texto(valor)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[.,;:!?()[\]{}"'“”‘’_-]/g, " ")
  .replace(/\s+/g, " ").trim();

const encabezadoNormalizado = (valor) => normalizarTexto(valor).replace(/[^a-z0-9]/g, "");

const comunes = {
  producto: ["articulo", "producto", "descripcion"],
  fecha: ["fecha"],
  cantidad: ["cantidad", "cant", "qty"],
  moneda: ["moneda"],
  sucursal: ["sucursal"],
};
const aliases = {
  ventas: {
    ...comunes,
    precio: ["venta", "precio", "precio venta", "precio de venta"],
    costo: ["costo", "coste"],
    canal: ["medio de pago", "medio", "canal", "canal de venta"],
    cliente: ["cliente"],
    ganancia: ["ganancia"],
  },
  compras: {
    ...comunes,
    costo: ["costo", "precio", "compra", "precio compra", "precio de compra"],
    proveedor: ["proveedor"],
  },
};

function validarColeccion(collection) {
  if (!Object.hasOwn(aliases, collection)) {
    throw new Error("Solo se pueden importar compras o ventas.");
  }
}

export function normalizarMonedaImportacion(valor) {
  if (vacio(valor)) return "ARS";
  const moneda = normalizarTexto(valor).replace(/\s/g, "").toUpperCase();
  if (["ARS", "$", "PESOS", "PESO", "PESOSARGENTINOS"].includes(moneda)) return "ARS";
  if (["USD", "U$S", "US$", "DOLAR", "DOLARES"].includes(moneda)) return "USD";
  return texto(valor);
}

// Celdas numéricas de Excel son preferibles. En texto se aceptan separadores
// argentinos (1.234,56) y decimales con punto (1234.56).
export function numeroImportacion(valor) {
  if (vacio(valor) || typeof valor === "boolean") return Number.NaN;
  if (typeof valor === "number") return valor;
  let numero = texto(valor).replace(/\s/g, "").replace(/^(ARS|USD|U\$S|US\$|\$)/i, "");
  if (numero.includes(",") && numero.includes(".")) {
    if (/^[+-]?\d{1,3}(\.\d{3})*,\d+$/.test(numero)) {
      numero = numero.replace(/\./g, "").replace(",", ".");
    } else if (/^[+-]?\d{1,3}(,\d{3})*\.\d+$/.test(numero)) {
      numero = numero.replace(/,/g, "");
    } else return Number.NaN;
  } else if (numero.includes(",")) {
    numero = numero.replace(",", ".");
  } else if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(numero)) {
    numero = numero.replace(/\./g, "");
  }
  return /^[+-]?\d+(\.\d+)?$/.test(numero) ? Number(numero) : Number.NaN;
}

const meses = [
  ["ene", "enero"], ["feb", "febrero"], ["mar", "marzo"],
  ["abr", "abril"], ["may", "mayo"], ["jun", "junio"],
  ["jul", "julio"], ["ago", "agosto"], ["sep", "sept", "septiembre", "setiembre"],
  ["oct", "octubre"], ["nov", "noviembre"], ["dic", "diciembre"],
];

function fechaLocal(anio, mes, dia) {
  if (anio < 100 || anio > 9999) return null;
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia ? fecha : null;
}

export function resolverFechaImportacion(valor, hoy = new Date(), date1904 = false) {
  if (valor instanceof Date) {
    return Number.isFinite(valor.getTime())
      ? fechaLocal(valor.getFullYear(), valor.getMonth() + 1, valor.getDate())
      : null;
  }
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return null;
    const partes = XLSX.SSF.parse_date_code(valor, { date1904 });
    return partes ? fechaLocal(partes.y, partes.m, partes.d) : null;
  }
  const entrada = texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const iso = entrada.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return fechaLocal(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const partes = entrada.match(/^(\d{1,2})[\s/-]+([a-z]+\.?|\d{1,2})(?:[\s/-]+(\d{2}|\d{4}))?$/);
  if (!partes) return null;
  const dia = Number(partes[1]);
  const mesTexto = partes[2].replace(/\.$/, "");
  const mes = /^\d+$/.test(mesTexto)
    ? Number(mesTexto)
    : meses.findIndex((opciones) => opciones.includes(mesTexto)) + 1;
  let anio = partes[3] ? Number(partes[3]) : hoy.getFullYear();
  if (partes[3]?.length === 2) anio += 2000;
  if (!partes[3] && (mes > hoy.getMonth() + 1 ||
    (mes === hoy.getMonth() + 1 && dia > hoy.getDate()))) anio -= 1;
  return fechaLocal(anio, mes, dia);
}

export function formatearFechaImportacion(fecha) {
  if (!(fecha instanceof Date) || !Number.isFinite(fecha.getTime())) return "";
  return [fecha.getDate(), fecha.getMonth() + 1, fecha.getFullYear()]
    .map((valor) => String(valor).padStart(2, "0")).join("/");
}

// Solo coincidencias exactas normalizadas: una ambigüedad nunca se resuelve sola.
export function buscarCoincidencia(valor, opciones = [], campos = ["descripcion", "nombre"]) {
  const buscado = normalizarTexto(valor);
  if (!buscado) return "";
  const candidatos = opciones.filter((item) =>
    campos.some((campo) => normalizarTexto(item[campo]) === buscado));
  return candidatos.length === 1 ? candidatos[0].id : "";
}

export const canalesImportables = (data) => (data.canalesVentas || [])
  .filter((canal) => canal.id !== "CV-A0000" && canal.estado === true);

function resolverRelacion(valor, opciones, defecto = "", campos = ["nombre"]) {
  if (!vacio(valor)) return buscarCoincidencia(valor, opciones, ["id", ...campos]);
  return opciones.some((item) => item.id === defecto) ? defecto : "";
}

export async function leerExcel(file, collection) {
  validarColeccion(collection);
  if (!file || !/\.(xls|xlsx)$/i.test(file.name)) {
    throw new Error("Seleccioná un archivo Excel con extensión .xls o .xlsx.");
  }
  if (!file.size) throw new Error("El archivo está vacío.");
  const contenido = await file.arrayBuffer();
  const bytes = new Uint8Array(contenido);
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
    .every((byte, index) => bytes[index] === byte);
  const xml = /<(?:\w+:)?Workbook[\s>]/i.test(new TextDecoder().decode(bytes.slice(0, 4096)));
  if (!zip && !ole && !xml) throw new Error("El contenido del archivo no tiene un formato Excel válido.");
  let workbook;
  try {
    // Fechas numéricas para resolver localmente también workbooks con calendario 1904.
    workbook = XLSX.read(contenido, { type: "array", cellDates: false, cellHTML: false, sheets: 0 });
  } catch {
    throw new Error("No se pudo leer el Excel. Verificá que no esté dañado ni protegido.");
  }
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  if (!hoja?.["!ref"]) throw new Error("La primera hoja está vacía.");
  const rango = XLSX.utils.decode_range(hoja["!ref"]);
  const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: null, blankrows: true });
  const indiceEncabezado = matriz.findIndex((fila) => fila.some((celda) => !vacio(celda)));
  if (indiceEncabezado < 0) throw new Error("La primera hoja está vacía.");
  const columnas = new Map();
  matriz[indiceEncabezado].forEach((celda, index) => {
    const clave = Object.keys(aliases[collection]).find((campo) =>
      aliases[collection][campo].some((alias) => encabezadoNormalizado(alias) === encabezadoNormalizado(celda)));
    if (!clave) return;
    if (columnas.has(clave)) throw new Error("Hay más de una columna para " + clave + ". Dejá una sola.");
    columnas.set(clave, index);
  });
  const requeridas = collection === "ventas" ? ["producto", "precio", "costo", "fecha"] : ["producto", "costo", "fecha"];
  const faltantes = requeridas.filter((campo) => !columnas.has(campo));
  if (faltantes.length) throw new Error("Faltan columnas requeridas: " + faltantes.join(", ") + ".");
  const filas = [];
  matriz.slice(indiceEncabezado + 1).forEach((fila, index) => {
    if (fila.every(vacio)) return;
    const filaExcel = rango.s.r + indiceEncabezado + index + 2;
    const valores = Object.fromEntries([...columnas].map(([clave, columna]) => {
      const celda = hoja[XLSX.utils.encode_cell({ r: filaExcel - 1, c: rango.s.c + columna })];
      return [clave, celda?.t === "e" ? "#ERROR EXCEL" : fila[columna]];
    }));
    filas.push({ ...valores, filaExcel });
  });
  if (!filas.length) throw new Error("La primera hoja no contiene filas de datos.");
  return { filas, date1904: Boolean(workbook.Workbook?.WBProps?.date1904) };
}

export function validarFilaImportacion(fila, collection, data) {
  validarColeccion(collection);
  const errores = [];
  const advertencias = [];
  const existe = (opciones, id) => Boolean(id) && (opciones || []).some((item) => item.id === id);
  if (!existe(data.productos, fila.productoId)) errores.push("Producto no identificado.");
  if (!Number.isFinite(fila.cantidad) || fila.cantidad <= 0) errores.push("La cantidad debe ser mayor a cero.");
  if (!Number.isFinite(fila.costo) || fila.costo < 0) errores.push("El costo debe ser un número válido mayor o igual a cero.");
  if (!["ARS", "USD"].includes(fila.moneda)) errores.push("Seleccioná una moneda: ARS o USD.");
  if (!(fila.fecha instanceof Date) || !Number.isFinite(fila.fecha.getTime())) errores.push("No se pudo interpretar la fecha.");
  if (!existe(data.sucursales, fila.sucursalId)) errores.push("Seleccioná una sucursal existente; la indicada en Excel o el default no se identificó.");
  if (collection === "ventas") {
    if (!Number.isFinite(fila.precio) || fila.precio < 0) errores.push("La venta debe ser un número válido mayor o igual a cero.");
    if (!existe(canalesImportables(data), fila.canalId)) errores.push("Seleccioná un canal de venta activo.");
    if (!existe(data.clientes, fila.clienteId)) errores.push("Seleccioná un cliente existente.");
    if (fila.gananciaExcel != null) {
      if (!Number.isFinite(fila.gananciaExcel)) advertencias.push("No se pudo interpretar la ganancia del Excel.");
      else if (Number.isFinite(fila.precio) && Number.isFinite(fila.costo) &&
        Math.abs(fila.gananciaExcel - (fila.precio - fila.costo)) > 0.01 + Number.EPSILON) {
        advertencias.push("La ganancia del Excel difiere de venta menos costo.");
      }
    }
  } else if (!existe(data.proveedores, fila.proveedorId)) errores.push("Seleccioná un proveedor existente.");
  return { ...fila, errores, advertencias };
}

export function normalizarFilasExcel(filas, collection, data, { hoy = new Date(), date1904 = false } = {}) {
  validarColeccion(collection);
  return filas.map((original) => {
    const fecha = resolverFechaImportacion(original.fecha, hoy, date1904);
    const fila = {
      filaExcel: original.filaExcel,
      productoOriginal: texto(original.producto),
      productoId: buscarCoincidencia(original.producto, data.productos || []),
      cantidad: vacio(original.cantidad) ? 1 : numeroImportacion(original.cantidad),
      costo: numeroImportacion(original.costo),
      costoOriginal: texto(original.costo),
      moneda: normalizarMonedaImportacion(original.moneda),
      fecha,
      fechaTexto: fecha ? formatearFechaImportacion(fecha) : texto(original.fecha),
      sucursalOriginal: texto(original.sucursal),
      sucursalId: resolverRelacion(original.sucursal, data.sucursales || [], "SC-A0001"),
    };
    if (collection === "ventas") {
      Object.assign(fila, {
        precio: numeroImportacion(original.precio),
        precioOriginal: texto(original.precio),
        canalOriginal: texto(original.canal),
        canalId: resolverRelacion(original.canal, canalesImportables(data), "CV-A0004", ["nombre", "descripcion"]),
        clienteOriginal: texto(original.cliente),
        clienteId: resolverRelacion(original.cliente, data.clientes || [], "CL-A0000"),
        gananciaExcel: vacio(original.ganancia) ? null : numeroImportacion(original.ganancia),
      });
    } else {
      Object.assign(fila, {
        proveedorOriginal: texto(original.proveedor),
        proveedorId: resolverRelacion(original.proveedor, data.proveedores || [], "PV-A0001"),
      });
    }
    return validarFilaImportacion(fila, collection, data);
  });
}

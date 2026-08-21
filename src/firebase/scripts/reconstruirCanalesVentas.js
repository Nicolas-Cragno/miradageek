import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const PROJECT_ID = "geek-look";
const WRITE_ARGUMENT = "--write=REPLACE_CHANNEL_STATS";
const WRITE_ENABLED = process.argv.includes(WRITE_ARGUMENT);

const CANAL_GENERAL = "CV-A0000";
const CANAL_OTROS = "CV-A0004";
const CANALES_VALIDOS = ["CV-A0001", "CV-A0002", "CV-A0003", "CV-A0004"];
const DOCUMENTOS_REQUERIDOS = [CANAL_GENERAL, ...CANALES_VALIDOS];

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}
const db = getFirestore();

const numero = (valor) => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
};
const redondear = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;
const fechaValida = (valor) => {
  if (!valor) return null;
  const fecha = typeof valor.toDate === "function" ? valor.toDate() : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};
const mesArgentina = (fecha) => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(fecha);
  const anio = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  return anio && mes ? `${anio}-${mes}` : null;
};
const normalizarMoneda = (valor) => {
  const moneda = String(valor ?? "ARS").toUpperCase();
  if (["USD", "DOLARES", "DÓLARES"].includes(moneda)) return "USD";
  if (["ARS", "PESOS", "PESO"].includes(moneda)) return "ARS";
  return null;
};
const nuevoAcumuladoCanal = () => ({
  ventas: 0,
  totalCostos: 0,
  totalPrecios: 0,
  ultimaVenta: null,
});
const nuevoAcumuladoMes = () => ({ ventas: 0, totalCostos: 0, totalPrecios: 0 });
const documento = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

async function cargarDatos() {
  const [ventasSnapshot, detallesSnapshot, productosSnapshot, canalesSnapshots] =
    await Promise.all([
      db.collection("ventas").get(),
      db.collection("detalleVentas").get(),
      db.collection("productos").get(),
      db.getAll(
        ...DOCUMENTOS_REQUERIDOS.map((id) =>
          db.collection("canalesVentas").doc(id),
        ),
      ),
    ]);

  const canalesFaltantes = canalesSnapshots
    .filter((snapshot) => !snapshot.exists)
    .map((snapshot) => snapshot.id);
  if (canalesFaltantes.length) {
    throw new Error(
      `Faltan documentos requeridos en canalesVentas: ${canalesFaltantes.join(", ")}`,
    );
  }
  return {
    ventas: ventasSnapshot.docs.map(documento),
    detalles: detallesSnapshot.docs.map(documento),
    productos: productosSnapshot.docs.map(documento),
  };
}

function crearAuditoria(datos) {
  const ventasPorId = new Map(datos.ventas.map((venta) => [venta.id, venta]));
  const productosPorId = new Map(datos.productos.map((producto) => [producto.id, producto]));
  const detallesPorVenta = new Map();
  const acumuladosCanales = new Map(
    CANALES_VALIDOS.map((canal) => [canal, nuevoAcumuladoCanal()]),
  );
  const acumuladosMeses = new Map();
  const incidencias = [];
  const productosInexistentes = new Set();
  const resumen = {
    totalVentasEncontradas: datos.ventas.length,
    totalDetalleVentas: datos.detalles.length,
    detallesActivos: 0,
    detallesInactivos: 0,
    detallesSinVenta: 0,
    ventasConDetalles: 0,
    ventasContabilizables: 0,
    ventasAnuladas: 0,
    ventasPendientes: 0,
    ventasSinCanal: 0,
    ventasCanalInvalido: 0,
    ventasSinFecha: 0,
    ventasUsdSinCotizacion: 0,
    costosDesdeDetalleHistorico: 0,
    costosDesdeProductoActual: 0,
    costosNoReconstruibles: 0,
    productosInexistentes: 0,
    ventasSinCantidadContabilizable: 0,
    errores: 0,
  };

  for (const detalle of datos.detalles) {
    if (detalle.activo === false) {
      resumen.detallesInactivos += 1;
      continue;
    }
    resumen.detallesActivos += 1;
    if (!detalle.venta) {
      resumen.detallesSinVenta += 1;
      incidencias.push({
        nivel: "detalle",
        id: detalle.id,
        codigo: "DETALLE_SIN_VENTA",
        bloqueaEscritura: true,
      });
      continue;
    }
    if (!detallesPorVenta.has(detalle.venta)) detallesPorVenta.set(detalle.venta, []);
    detallesPorVenta.get(detalle.venta).push(detalle);
  }
  resumen.ventasConDetalles = detallesPorVenta.size;

  const resolverCosto = (detalle) => {
    if (detalle.costoEnPesos !== undefined && detalle.costoEnPesos !== null) {
      const costo = numero(detalle.costoEnPesos);
      if (costo !== null && costo >= 0) {
        resumen.costosDesdeDetalleHistorico += 1;
        return { costo, fuente: "detalle.costoEnPesos" };
      }
      return { costo: null, motivo: "COSTO_EN_PESOS_INVALIDO" };
    }
    if (detalle.costo !== undefined && detalle.costo !== null) {
      const costo = numero(detalle.costo);
      const moneda = normalizarMoneda(detalle.monedaCosto);
      if (costo === null || costo < 0 || !moneda) {
        return { costo: null, motivo: "COSTO_HISTORICO_INVALIDO" };
      }
      if (moneda === "ARS") {
        resumen.costosDesdeDetalleHistorico += 1;
        return { costo, fuente: "detalle.costo" };
      }
      const cotizacion = numero(detalle.valorDivisaCosto);
      if (cotizacion !== null && cotizacion > 0) {
        resumen.costosDesdeDetalleHistorico += 1;
        return {
          costo: redondear(costo * cotizacion),
          fuente: "detalle.costo+valorDivisaCosto",
        };
      }
      return { costo: null, motivo: "COSTO_HISTORICO_USD_SIN_COTIZACION" };
    }
    const producto = productosPorId.get(detalle.idProducto);
    if (!producto) {
      if (detalle.idProducto) productosInexistentes.add(detalle.idProducto);
      return { costo: null, motivo: "PRODUCTO_INEXISTENTE" };
    }
    const costo = numero(producto.costo);
    const moneda = normalizarMoneda(producto.monedaCosto);
    if (costo === null || costo < 0 || !moneda) {
      return { costo: null, motivo: "COSTO_ACTUAL_INVALIDO" };
    }
    if (moneda === "USD") {
      return { costo: null, motivo: "COSTO_ACTUAL_USD_SIN_COTIZACION_HISTORICA" };
    }
    resumen.costosDesdeProductoActual += 1;
    return { costo, fuente: "producto.costo" };
  };

  for (const [ventaId, detalles] of detallesPorVenta) {
    const venta = ventasPorId.get(ventaId);
    if (!venta) {
      incidencias.push({
        nivel: "venta",
        id: ventaId,
        detalles: detalles.map((detalle) => detalle.id),
        codigo: "VENTA_INEXISTENTE",
        bloqueaEscritura: true,
      });
      continue;
    }
    const estado = venta.estado ?? "COMPLETADA";
    if (estado === "ANULADA") {
      resumen.ventasAnuladas += 1;
      continue;
    }
    if (estado === "PENDIENTE") resumen.ventasPendientes += 1;

    const detallesContabilizables = detalles
      .map((detalle) => ({
        detalle,
        cantidad: numero(
          venta.estado === undefined ? detalle.cantidad : detalle.cantidadCumplida,
        ),
      }))
      .filter(({ cantidad }) => cantidad !== null && cantidad > 0);
    if (!detallesContabilizables.length) {
      resumen.ventasSinCantidadContabilizable += 1;
      continue;
    }

    const canalOriginal = venta.canal;
    if (!canalOriginal) resumen.ventasSinCanal += 1;
    if (canalOriginal && !CANALES_VALIDOS.includes(canalOriginal)) {
      resumen.ventasCanalInvalido += 1;
    }
    const canal = CANALES_VALIDOS.includes(canalOriginal) ? canalOriginal : CANAL_OTROS;

    const fechasDetalle = detallesContabilizables
      .map(({ detalle }) => fechaValida(detalle.fecha))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());
    const fechaEconomica = fechaValida(venta.fecha) ?? fechasDetalle[0] ?? null;
    if (!fechaEconomica) {
      resumen.ventasSinFecha += 1;
      incidencias.push({
        nivel: "venta",
        id: ventaId,
        codigo: "VENTA_SIN_FECHA",
        bloqueaEscritura: true,
      });
      continue;
    }

    const monedaVenta = normalizarMoneda(venta.moneda);
    const cotizacionVenta = monedaVenta === "ARS" ? 1 : numero(venta.valorDivisa);
    if (!monedaVenta || (monedaVenta === "USD" && !(cotizacionVenta > 0))) {
      resumen.ventasUsdSinCotizacion += monedaVenta === "USD" ? 1 : 0;
      incidencias.push({
        nivel: "venta",
        id: ventaId,
        codigo: monedaVenta === "USD"
          ? "VENTA_USD_SIN_COTIZACION"
          : "MONEDA_VENTA_INVALIDA",
        bloqueaEscritura: true,
      });
      continue;
    }

    const descuento = numero(venta.descuento ?? 0);
    if (descuento === null || descuento < 0 || descuento > 100) {
      incidencias.push({
        nivel: "venta",
        id: ventaId,
        codigo: "DESCUENTO_INVALIDO",
        valor: venta.descuento,
        bloqueaEscritura: true,
      });
      continue;
    }

    let totalCostosVenta = 0;
    let totalPreciosVenta = 0;
    let ventaCompleta = true;
    for (const { detalle, cantidad } of detallesContabilizables) {
      const precio = numero(detalle.precio);
      if (precio === null || precio < 0) {
        ventaCompleta = false;
        incidencias.push({
          nivel: "detalle",
          id: detalle.id,
          venta: ventaId,
          codigo: "PRECIO_INVALIDO",
          bloqueaEscritura: true,
        });
        continue;
      }
      const costo = resolverCosto(detalle);
      if (costo.costo === null) {
        ventaCompleta = false;
        resumen.costosNoReconstruibles += 1;
        incidencias.push({
          nivel: "detalle",
          id: detalle.id,
          venta: ventaId,
          producto: detalle.idProducto ?? null,
          codigo: costo.motivo,
          bloqueaEscritura: true,
        });
        continue;
      }
      totalPreciosVenta += precio * cantidad * cotizacionVenta * (1 - descuento / 100);
      totalCostosVenta += costo.costo * cantidad;
    }
    if (!ventaCompleta) continue;

    const mes = mesArgentina(fechaEconomica);
    if (!mes) {
      resumen.ventasSinFecha += 1;
      incidencias.push({
        nivel: "venta",
        id: ventaId,
        codigo: "MES_NO_RECONSTRUIBLE",
        bloqueaEscritura: true,
      });
      continue;
    }

    const canalAcumulado = acumuladosCanales.get(canal);
    canalAcumulado.ventas += 1;
    canalAcumulado.totalCostos = redondear(canalAcumulado.totalCostos + totalCostosVenta);
    canalAcumulado.totalPrecios = redondear(canalAcumulado.totalPrecios + totalPreciosVenta);
    if (!canalAcumulado.ultimaVenta || fechaEconomica > canalAcumulado.ultimaVenta) {
      canalAcumulado.ultimaVenta = fechaEconomica;
    }

    if (!acumuladosMeses.has(mes)) acumuladosMeses.set(mes, nuevoAcumuladoMes());
    const mesAcumulado = acumuladosMeses.get(mes);
    mesAcumulado.ventas += 1;
    mesAcumulado.totalCostos = redondear(mesAcumulado.totalCostos + totalCostosVenta);
    mesAcumulado.totalPrecios = redondear(mesAcumulado.totalPrecios + totalPreciosVenta);
    resumen.ventasContabilizables += 1;
  }

  resumen.productosInexistentes = productosInexistentes.size;
  resumen.errores = incidencias.filter((item) => item.bloqueaEscritura).length;
  const canales = Object.fromEntries(
    [...acumuladosCanales.entries()].map(([id, datosCanal]) => [
      id,
      {
        ventas: datosCanal.ventas,
        totalCostos: datosCanal.totalCostos,
        totalPrecios: datosCanal.totalPrecios,
        totalGanancias: redondear(datosCanal.totalPrecios - datosCanal.totalCostos),
        ultimaVenta: datosCanal.ultimaVenta?.toISOString() ?? null,
      },
    ]),
  );
  const meses = Object.fromEntries(
    [...acumuladosMeses.entries()]
      .sort(([mesA], [mesB]) => mesA.localeCompare(mesB))
      .map(([mes, datosMes]) => [
        mes,
        {
          ...datosMes,
          totalGanancias: redondear(datosMes.totalPrecios - datosMes.totalCostos),
        },
      ]),
  );
  return {
    generadoEn: new Date().toISOString(),
    proyecto: PROJECT_ID,
    modo: WRITE_ENABLED ? "ESCRITURA_SOLICITADA" : "DRY_RUN",
    auditoriaCompleta: resumen.errores === 0,
    escrituraBloqueada: resumen.errores > 0,
    resumen,
    productosInexistentes: [...productosInexistentes].sort(),
    acumulados: { canales, meses },
    incidencias,
    internos: { acumuladosCanales, acumuladosMeses },
  };
}

const datosPersistibles = (auditoria) => ({
  canales: Object.fromEntries(
    CANALES_VALIDOS.map((id) => {
      const datos = auditoria.internos.acumuladosCanales.get(id);
      return [
        id,
        {
          ventas: datos.ventas,
          totalCostos: datos.totalCostos,
          totalPrecios: datos.totalPrecios,
          ultimaVenta: datos.ultimaVenta ? Timestamp.fromDate(datos.ultimaVenta) : null,
        },
      ];
    }),
  ),
  meses: Object.fromEntries(
    [...auditoria.internos.acumuladosMeses.entries()].map(([mes, datos]) => [
      mes,
      {
        ventas: datos.ventas,
        totalCostos: datos.totalCostos,
        totalPrecios: datos.totalPrecios,
      },
    ]),
  ),
});

async function escribirYVerificar(auditoria) {
  if (auditoria.escrituraBloqueada) {
    throw new Error("La auditoría contiene incidencias bloqueantes. No se escribió Firestore.");
  }
  const esperado = datosPersistibles(auditoria);
  const batch = db.batch();
  for (const id of CANALES_VALIDOS) {
    batch.update(db.collection("canalesVentas").doc(id), esperado.canales[id]);
  }
  batch.update(db.collection("canalesVentas").doc(CANAL_GENERAL), { meses: esperado.meses });
  await batch.commit();

  const snapshots = await db.getAll(
    ...DOCUMENTOS_REQUERIDOS.map((id) => db.collection("canalesVentas").doc(id)),
  );
  const diferencias = [];
  for (const snapshot of snapshots) {
    const actual = snapshot.data();
    if (snapshot.id === CANAL_GENERAL) {
      if (JSON.stringify(actual.meses || {}) !== JSON.stringify(esperado.meses)) {
        diferencias.push({ documento: snapshot.id, campo: "meses" });
      }
      continue;
    }
    const esperadoCanal = esperado.canales[snapshot.id];
    for (const campo of ["ventas", "totalCostos", "totalPrecios"]) {
      if (actual[campo] !== esperadoCanal[campo]) diferencias.push({ documento: snapshot.id, campo });
    }
    const actualFecha = actual.ultimaVenta?.toMillis?.() ?? null;
    const esperadaFecha = esperadoCanal.ultimaVenta?.toMillis?.() ?? null;
    if (actualFecha !== esperadaFecha) {
      diferencias.push({ documento: snapshot.id, campo: "ultimaVenta" });
    }
  }
  return { verificacionCorrecta: diferencias.length === 0, diferencias };
}

async function main() {
  const datos = await cargarDatos();
  const auditoria = crearAuditoria(datos);
  const salida = { ...auditoria };
  delete salida.internos;
  if (!WRITE_ENABLED) {
    salida.escrituraRealizada = false;
    salida.mensaje = `DRY_RUN: para solicitar escritura se requiere ${WRITE_ARGUMENT}`;
    console.log(JSON.stringify(salida, null, 2));
    return;
  }
  const verificacion = await escribirYVerificar(auditoria);
  salida.escrituraRealizada = true;
  salida.verificacionPosterior = verificacion;
  console.log(JSON.stringify(salida, null, 2));
  if (!verificacion.verificacionCorrecta) process.exitCode = 2;
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        modo: WRITE_ENABLED ? "ESCRITURA_SOLICITADA" : "DRY_RUN",
        escrituraRealizada: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});

import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import {
  calcularMontos,
  cantidadRestante,
  estadoSegunDetalles,
  ESTADOS_OPERACION,
  normalizarStockSucursal,
  numeroSeguro,
  TIPOS_MOVIMIENTO,
  TIPOS_MOVIMIENTO_MANUAL,
  normalizarTipoMovimiento,
  actualizarStockSucursal,
} from "./modeloOperaciones";
import {
  aplicarDiferenciaEstadistica,
  calcularHuellaVenta,
  leerAcumuladosVenta,
  normalizarMoneda,
  validarCanalSeleccionable,
} from "./estadisticasVentas";

const valoresIguales = (anterior, siguiente) => {
  if (anterior === siguiente) return true;
  if (anterior?.isEqual && siguiente?.isEqual) {
    return anterior.isEqual(siguiente);
  }
  if (Array.isArray(anterior) && Array.isArray(siguiente)) {
    return anterior.length === siguiente.length &&
      anterior.every((valor, indice) => valoresIguales(valor, siguiente[indice]));
  }
  if (
    anterior &&
    siguiente &&
    typeof anterior === "object" &&
    typeof siguiente === "object"
  ) {
    const clavesAnterior = Object.keys(anterior);
    const clavesSiguiente = Object.keys(siguiente);
    return clavesAnterior.length === clavesSiguiente.length &&
      clavesAnterior.every(
        (clave) => clave in siguiente && valoresIguales(anterior[clave], siguiente[clave]),
      );
  }
  return false;
};

const aplicarDiferenciaSinEscriturasRedundantes = ({
  transaction,
  acumulados,
  huellaAnterior,
  huellaNueva,
}) => {
  const documentosActuales = new Map(
    [...acumulados.values()].map(({ referencia, datos }) => [referencia.path, datos]),
  );
  const transactionConCambiosReales = {
    update(referencia, cambios) {
      const documentoActual = documentosActuales.get(referencia.path);
      const cambiaDocumento = !documentoActual || Object.entries(cambios).some(
        ([campo, valor]) => !valoresIguales(documentoActual[campo], valor),
      );
      if (cambiaDocumento) transaction.update(referencia, cambios);
    },
  };

  aplicarDiferenciaEstadistica({
    transaction: transactionConCambiosReales,
    acumulados,
    huellaAnterior,
    huellaNueva,
  });
};

const configuracionIds = {
  compras: ["CP-", 8, 99999999],
  detalleCompras: ["DC-", 8, 99999999],
  ventas: ["VT-", 8, 99999999],
  detalleVentas: ["DV-", 8, 99999999],
  stock: ["ST-", 8, 99999999],
  detalleStock: ["DS-", 8, 99999999],
};

const camposInternosDetalle = new Set([
  "id",
  "label",
  "labelProducto",
  "stockActual",
  "diferencia",
]);

const limpiarDetalle = (detalle) =>
  Object.fromEntries(
    Object.entries(detalle).filter(([campo]) => !camposInternosDetalle.has(campo)),
  );

const validarUsuarioInterno = (usuario) => {
  if (typeof usuario !== "string" || !/^US-[A-Z][0-9]{4}$/.test(usuario)) {
    throw new Error(
      "No pudimos identificar tu usuario interno. Cerrá sesión y volvé a ingresar.",
    );
  }
};

const siguienteSerie = (serie) => {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const caracteres = serie.split("");
  let indice = caracteres.length - 1;

  while (indice >= 0) {
    const posicion = letras.indexOf(caracteres[indice]);
    if (posicion < 25) {
      caracteres[indice] = letras[posicion + 1];
      return caracteres.join("");
    }
    caracteres[indice] = "A";
    indice -= 1;
  }

  caracteres.unshift("A");
  return caracteres.join("");
};

const asignarCodigos = (coleccion, contador, cantidad) => {
  const [prefijo, longitud, maximo] = configuracionIds[coleccion];
  let serie = contador.serie || "A";
  let ultimo = numeroSeguro(contador.ultimo);
  const codigos = [];

  for (let indice = 0; indice < cantidad; indice += 1) {
    ultimo += 1;
    if (ultimo > maximo) {
      serie = siguienteSerie(serie);
      ultimo = 1;
    }
    codigos.push(`${prefijo}${serie}${String(ultimo).padStart(longitud, "0")}`);
  }

  return { codigos, contador: { serie, ultimo } };
};

const validarDetalles = (detalles) => {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw new Error("La operación debe contener al menos un producto.");
  }

  const productos = new Set();
  detalles.forEach((detalle) => {
    const cantidad = numeroSeguro(detalle.cantidad, Number.NaN);
    const precio = numeroSeguro(detalle.precio, Number.NaN);
    const cumplida = numeroSeguro(detalle.cantidadCumplida);
    if (!detalle.idProducto) throw new Error("Todos los detalles requieren producto.");
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error("Todas las cantidades deben ser mayores a cero.");
    }
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error("Todos los precios deben ser números válidos.");
    }
    if (cumplida < 0 || cumplida > cantidad) {
      throw new Error("La cantidad cumplida no puede superar la solicitada.");
    }
    if (productos.has(detalle.idProducto)) {
      throw new Error("No puede haber productos repetidos en una operación.");
    }
    productos.add(detalle.idProducto);
  });
};

const edicionesDetalle = (anterior, siguiente, usuario, fecha) => {
  const cambios = [];
  for (const campo of ["idProducto", "cantidad", "precio"]) {
    if (String(anterior?.[campo] ?? "") !== String(siguiente?.[campo] ?? "")) {
      cambios.push({
        fecha,
        usuario,
        campo,
        valorAnterior: anterior?.[campo] ?? null,
        valorNuevo: siguiente?.[campo] ?? null,
      });
    }
  }
  return cambios;
};

const edicionesEncabezado = (anterior, siguiente, usuario, fecha) => {
  const cambios = [];
  for (const campo of [
    "sucursal",
    "proveedor",
    "cliente",
    "detalle",
    "descuento",
    "moneda",
    "valorDivisa",
  ]) {
    if (String(anterior?.[campo] ?? "") !== String(siguiente?.[campo] ?? "")) {
      cambios.push({
        fecha,
        usuario,
        campo,
        valorAnterior: anterior?.[campo] ?? null,
        valorNuevo: siguiente?.[campo] ?? null,
      });
    }
  }
  return cambios;
};

const aplicarMovimientoSucursal = ({
  producto,
  sucursalesDisponibles,
  sucursal,
  diferencia,
}) => {
  const distribucion = normalizarStockSucursal(
    producto,
    sucursalesDisponibles,
    sucursal,
  );
  return actualizarStockSucursal(distribucion, sucursal, diferencia);
};

const prepararMovimiento = ({
  operacionId,
  coleccion,
  sucursal,
  usuario,
  detalles,
}) => ({
  tipo:
    coleccion === "compras"
      ? TIPOS_MOVIMIENTO.INGRESO
      : TIPOS_MOVIMIENTO.EGRESO,
  sucursal,
  detalle: `${coleccion === "compras" ? "Cumplimiento de compra" : "Cumplimiento de venta"} ${operacionId}`,
  usuario,
  origenTipo: coleccion,
  origenId: operacionId,
  detalles,
});

const escribirMovimiento = ({
  transaction,
  movimiento,
  asignacionStock,
  asignacionDetalles,
}) => {
  const [movimientoId] = asignacionStock.codigos;
  transaction.set(doc(db, "stock", movimientoId), {
    id: movimientoId,
    tipo: movimiento.tipo,
    sucursal: movimiento.sucursal,
    detalle: movimiento.detalle,
    usuario: movimiento.usuario,
    origenTipo: movimiento.origenTipo,
    origenId: movimiento.origenId,
    fecha: serverTimestamp(),
  });
  movimiento.detalles.forEach((detalle, indice) => {
    const detalleId = asignacionDetalles.codigos[indice];
    transaction.set(doc(db, "detalleStock", detalleId), {
      stock: movimientoId,
      idProducto: detalle.idProducto,
      descripcion: detalle.descripcion || "",
      cantidad: detalle.cantidad,
      stockAnterior: detalle.stockAnterior,
      stockNuevo: detalle.stockNuevo,
      tipo: movimiento.tipo,
      fecha: serverTimestamp(),
    });
  });
};

export async function guardarMovimientoManual({
  data,
  detalles,
  usuario,
  sucursalesDisponibles = [],
  permitirNegativo = false,
}) {
  validarUsuarioInterno(usuario);
  const tipoMovimiento = normalizarTipoMovimiento(data.tipo);
  if (!data.sucursal) throw new Error("Seleccioná una sucursal.");
  if (!TIPOS_MOVIMIENTO_MANUAL.includes(tipoMovimiento)) {
    throw new Error("Seleccioná un tipo de movimiento válido.");
  }
  if (!detalles.length) throw new Error("Agregá al menos un producto.");

  return runTransaction(db, async (transaction) => {
    const productos = new Map();
    for (const detalle of detalles) {
      if (productos.has(detalle.idProducto)) {
        throw new Error("No puede haber productos repetidos.");
      }
      const referencia = doc(db, "productos", detalle.idProducto);
      const snapshot = await transaction.get(referencia);
      if (!snapshot.exists()) throw new Error(`No existe ${detalle.idProducto}.`);
      if (
        [
          "PR-A00000104",
          "PR-A00000105",
          "PR-A00000106",
          "PR-A00000108",
          "PR-A00000109",
        ].includes(detalle.idProducto)
      ) {
        const datosDebug = snapshot.data();
        const camposDebug = [
          "descripcion",
          "monedaCosto",
          "monedaPrecio",
          "costo",
          "precio",
          "stock",
          "stockSucursal",
          "reservado",
          "pendiente",
          "fecha",
          "ediciones",
        ];
        console.group(`[Stock debug] ${detalle.idProducto}`);
        console.log("ID", detalle.idProducto);
        console.log("Campos", Object.keys(datosDebug).sort());
        console.log("Documento crudo", datosDebug);
        console.table(
          Object.fromEntries(
            Object.entries(datosDebug).map(([campo, valor]) => [
              campo,
              {
                tipo:
                  valor === null
                    ? "null"
                    : Array.isArray(valor)
                      ? "array"
                      : typeof valor,
                valor,
              },
            ]),
          ),
        );
        console.log(
          "Campos relevantes",
          Object.fromEntries(
            camposDebug.map((campo) => [campo, datosDebug[campo]]),
          ),
        );
        console.groupEnd();
      }
      productos.set(detalle.idProducto, { referencia, datos: snapshot.data() });
    }
    const contadores = await leerContadoresMovimiento(transaction, detalles.length);
    const movimientoDetalles = [];

    for (const detalle of detalles) {
      const producto = productos.get(detalle.idProducto);
      const diferencia = numeroSeguro(detalle.diferencia, Number.NaN);
      if (!Number.isFinite(diferencia) || diferencia === 0) {
        throw new Error("Cada movimiento debe tener una diferencia distinta de cero.");
      }
      if (tipoMovimiento === TIPOS_MOVIMIENTO.INGRESO && diferencia < 0) {
        throw new Error("Un ingreso debe aumentar el stock.");
      }
      if (tipoMovimiento === TIPOS_MOVIMIENTO.EGRESO && diferencia > 0) {
        throw new Error("Un egreso debe disminuir el stock.");
      }
      const distribucion = normalizarStockSucursal(
        producto.datos,
        sucursalesDisponibles,
        data.sucursal,
      );
      const stockSucursalAnterior = numeroSeguro(
        distribucion.find((item) => item.sucursal === data.sucursal)?.stock,
      );
      const actualizado = actualizarStockSucursal(
        distribucion,
        data.sucursal,
        diferencia,
      );
      const stockSucursalNuevo = stockSucursalAnterior + diferencia;
      if (
        !permitirNegativo &&
        (actualizado.stock < 0 || stockSucursalNuevo < 0)
      ) {
        const error = new Error(
          `El stock de ${producto.datos.descripcion || detalle.idProducto} en la sucursal será ${stockSucursalNuevo}.`,
        );
        error.code = "stock-negativo";
        throw error;
      }
      if (
        [
          "PR-A00000104",
          "PR-A00000105",
          "PR-A00000106",
          "PR-A00000108",
          "PR-A00000109",
        ].includes(detalle.idProducto)
      ) {
        console.log(
          `[Stock debug] UPDATE ${detalle.idProducto}`,
          actualizado,
        );
      }
      transaction.update(producto.referencia, actualizado);
      movimientoDetalles.push({
        idProducto: detalle.idProducto,
        descripcion: producto.datos.descripcion || detalle.descripcion || "",
        cantidad: diferencia,
        stockAnterior: stockSucursalAnterior,
        stockNuevo: stockSucursalNuevo,
      });
    }

    transaction.update(contadores.stockRef, contadores.asignacionStock.contador);
    transaction.update(
      contadores.detalleStockRef,
      contadores.asignacionDetalles.contador,
    );
    escribirMovimiento({
      transaction,
      movimiento: {
        tipo: tipoMovimiento,
        sucursal: data.sucursal,
        detalle: data.detalle || "Movimiento manual",
        usuario,
        origenTipo: data.origenTipo || "manual",
        origenId: data.origenId || "",
        detalles: movimientoDetalles,
      },
      asignacionStock: contadores.asignacionStock,
      asignacionDetalles: contadores.asignacionDetalles,
    });
  });
}

export async function transferirStock({
  idProducto,
  cantidad,
  sucursalOrigen,
  sucursalDestino,
  detalle,
  usuario,
  sucursalesDisponibles = [],
  permitirNegativo = false,
}) {
  validarUsuarioInterno(usuario);
  const unidades = numeroSeguro(cantidad, Number.NaN);
  if (!idProducto || !Number.isFinite(unidades) || unidades <= 0) {
    throw new Error("Seleccioná un producto y una cantidad mayor a cero.");
  }
  if (!sucursalOrigen || !sucursalDestino || sucursalOrigen === sucursalDestino) {
    throw new Error("El origen y el destino deben ser sucursales diferentes.");
  }

  return runTransaction(db, async (transaction) => {
    const productoRef = doc(db, "productos", idProducto);
    const productoSnapshot = await transaction.get(productoRef);
    if (!productoSnapshot.exists()) throw new Error("El producto no existe.");
    const producto = productoSnapshot.data();
    const distribucion = normalizarStockSucursal(
      producto,
      sucursalesDisponibles,
      sucursalOrigen,
    );
    const stockOrigen = numeroSeguro(
      distribucion.find((item) => item.sucursal === sucursalOrigen)?.stock,
    );
    if (!permitirNegativo && stockOrigen - unidades < 0) {
      const error = new Error(
        `La sucursal de origen quedará con ${stockOrigen - unidades} unidades.`,
      );
      error.code = "stock-negativo";
      throw error;
    }
    const trasEgreso = actualizarStockSucursal(distribucion, sucursalOrigen, -unidades);
    const trasIngreso = actualizarStockSucursal(
      trasEgreso.stockSucursal,
      sucursalDestino,
      unidades,
    );
    const contadores = await leerContadoresMovimiento(transaction, 1);
    transaction.update(productoRef, {
      stock: trasIngreso.stock,
      stockSucursal: trasIngreso.stockSucursal,
    });
    transaction.update(contadores.stockRef, contadores.asignacionStock.contador);
    transaction.update(
      contadores.detalleStockRef,
      contadores.asignacionDetalles.contador,
    );
    escribirMovimiento({
      transaction,
      movimiento: {
        tipo: TIPOS_MOVIMIENTO.TRANSFERENCIA,
        sucursal: sucursalOrigen,
        detalle: detalle || "Transferencia entre sucursales",
        usuario,
        origenTipo: "transferencia",
        origenId: sucursalDestino,
        detalles: [{
          idProducto,
          descripcion: producto.descripcion || "",
          cantidad: unidades,
          stockAnterior: stockOrigen,
          stockNuevo: stockOrigen - unidades,
        }],
      },
      asignacionStock: contadores.asignacionStock,
      asignacionDetalles: contadores.asignacionDetalles,
    });
  });
}

export async function guardarOperacionNucleo({
  collection: coleccion,
  data,
  idElemento = null,
  detailCollection,
  detailRef,
  detalleNuevo = [],
  detalleOriginal = [],
  usuario,
  valorDolar = null,
  sucursalesDisponibles = [],
  permitirNegativo = false,
  cotizacionCosto = null,
}) {
  validarUsuarioInterno(usuario);
  validarDetalles(detalleNuevo);
  const esCompra = coleccion === "compras";
  const campoObligacion = esCompra ? "pendiente" : "reservado";
  const estadoSolicitado = data.estado || ESTADOS_OPERACION.PENDIENTE;
  const esAltaCompletada = !idElemento && estadoSolicitado === ESTADOS_OPERACION.COMPLETADA;
  const fechaCambio = Timestamp.now();

  if (!idElemento && (!Number.isFinite(valorDolar) || valorDolar <= 0)) {
    throw new Error(
      "No se pudo obtener una cotización oficial válida. La operación no fue guardada.",
    );
  }

  return runTransaction(db, async (transaction) => {
    const contadorPrincipalRef = idElemento
      ? null
      : doc(db, "contadores", coleccion);
    const contadorDetalleRef = doc(db, "contadores", detailCollection);
    const contadorStockRef = esAltaCompletada ? doc(db, "contadores", "stock") : null;
    const contadorDetalleStockRef = esAltaCompletada
      ? doc(db, "contadores", "detalleStock")
      : null;

    const contadorPrincipal = contadorPrincipalRef
      ? await transaction.get(contadorPrincipalRef)
      : null;
    const contadorDetalle = await transaction.get(contadorDetalleRef);
    const contadorStock = contadorStockRef
      ? await transaction.get(contadorStockRef)
      : null;
    const contadorDetalleStock = contadorDetalleStockRef
      ? await transaction.get(contadorDetalleStockRef)
      : null;
    if (contadorPrincipalRef && !contadorPrincipal.exists()) {
      throw new Error(`No existe el contador ${coleccion}.`);
    }
    if (!contadorDetalle.exists()) {
      throw new Error(`No existe el contador ${detailCollection}.`);
    }
    if (esAltaCompletada && (!contadorStock.exists() || !contadorDetalleStock.exists())) {
      throw new Error("No existen los contadores de movimientos de stock.");
    }

    const operacionRef = idElemento ? doc(db, coleccion, idElemento) : null;
    const operacionSnapshot = operacionRef
      ? await transaction.get(operacionRef)
      : null;
    if (operacionRef && !operacionSnapshot.exists()) {
      throw new Error("La operación ya no existe.");
    }
    if (operacionSnapshot?.data().estado === ESTADOS_OPERACION.ANULADA) {
      throw new Error("Una operación anulada no puede editarse.");
    }

    const idsProductos = [
      ...new Set(
        [...detalleNuevo, ...detalleOriginal]
          .map((detalle) => detalle.idProducto)
          .filter(Boolean),
      ),
    ];
    const productos = new Map();
    for (const idProducto of idsProductos) {
      const referencia = doc(db, "productos", idProducto);
      const snapshot = await transaction.get(referencia);
      if (!snapshot.exists()) throw new Error(`No existe el producto ${idProducto}.`);
      productos.set(idProducto, { referencia, datos: snapshot.data() });
    }

    let operacionId = idElemento;
    let asignacionPrincipal = null;
    if (!operacionId) {
      asignacionPrincipal = asignarCodigos(coleccion, contadorPrincipal.data(), 1);
      [operacionId] = asignacionPrincipal.codigos;
    }

    const operacionAnterior = operacionSnapshot?.data() || {};
    const esHistorica = Boolean(idElemento && !operacionAnterior.estado);
    const originalesNormalizados = detalleOriginal.map((detalle) => ({
      ...detalle,
      cantidadCumplida: esHistorica
        ? numeroSeguro(detalle.cantidad)
        : numeroSeguro(detalle.cantidadCumplida),
    }));
    const nuevosNormalizados = detalleNuevo.map((detalle) => {
      const anterior = originalesNormalizados.find((item) => item.id === detalle.id);
      if (
        esHistorica &&
        anterior &&
        (String(anterior.idProducto) !== String(detalle.idProducto) ||
          String(anterior.cantidad) !== String(detalle.cantidad))
      ) {
        throw new Error(
          "Los productos y cantidades de una operación histórica requieren una corrección física definida. Podés editar sus datos administrativos.",
        );
      }
      const cantidadCumplida = !idElemento
        ? esAltaCompletada
          ? numeroSeguro(detalle.cantidad)
          : 0
        : numeroSeguro(anterior?.cantidadCumplida);
      if (numeroSeguro(detalle.cantidad) < cantidadCumplida) {
        throw new Error("La cantidad no puede ser menor a la cantidad ya cumplida.");
      }
      if (anterior && anterior.idProducto !== detalle.idProducto && cantidadCumplida > 0) {
        throw new Error("No puede cambiarse un producto que ya tuvo cumplimiento.");
      }
      const normalizado = { ...detalle, cantidadCumplida, activo: true };
      if (!esCompra) {
        if (anterior) {
          for (const campo of [
            "costo",
            "monedaCosto",
            "valorDivisaCosto",
            "costoEnPesos",
            "cumplimientos",
          ]) {
            if (anterior[campo] !== undefined) normalizado[campo] = anterior[campo];
          }
        } else {
          const producto = productos.get(detalle.idProducto)?.datos;
          const costo = numeroSeguro(producto?.costo, Number.NaN);
          const monedaCosto = normalizarMoneda(producto?.monedaCosto);
          const valorDivisaCosto = monedaCosto === "USD"
            ? numeroSeguro(cotizacionCosto, Number.NaN)
            : 1;
          if (!Number.isFinite(costo) || costo < 0) {
            throw new Error("El producto no tiene un costo válido para guardar su valor histórico.");
          }
          if (
            !Number.isFinite(valorDivisaCosto) ||
            valorDivisaCosto <= 0 ||
            (monedaCosto === "USD" && valorDivisaCosto === 1)
          ) {
            throw new Error(
              "No se pudo obtener una cotización válida para conservar el costo histórico en pesos.",
            );
          }
          normalizado.costo = costo;
          normalizado.monedaCosto = monedaCosto;
          normalizado.valorDivisaCosto = valorDivisaCosto;
          normalizado.costoEnPesos = costo * valorDivisaCosto;
          normalizado.cumplimientos = esAltaCompletada
            ? [{ fecha: fechaCambio, cantidad: numeroSeguro(detalle.cantidad) }]
            : [];
        }
      }
      return normalizado;
    });

    for (const anterior of originalesNormalizados) {
      if (!nuevosNormalizados.some((detalle) => detalle.id === anterior.id)) {
        if (numeroSeguro(anterior.cantidadCumplida) > 0) {
          throw new Error("No puede eliminarse un detalle que ya tuvo cumplimiento.");
        }
      }
    }

    const estado = estadoSegunDetalles(nuevosNormalizados);
    const { parcial, monto } = calcularMontos(nuevosNormalizados, data.descuento);
    const moneda = normalizarMoneda(data.moneda);
    const valorDivisa = moneda === "ARS"
      ? 1
      : numeroSeguro(data.valorDivisa, Number.NaN);
    if (
      moneda === "USD" &&
      (!Number.isFinite(valorDivisa) || valorDivisa <= 0 || valorDivisa === 1)
    ) {
      throw new Error("Ingresá una cotización USD válida y distinta de 1.");
    }
    const ventaConEstadisticas = numeroSeguro(operacionAnterior.estadisticas?.ventas) > 0;
    const ventaConCumplimientos = originalesNormalizados.some(
      (detalle) =>
        numeroSeguro(detalle.cantidadCumplida) > 0 ||
        (detalle.cumplimientos || []).length > 0,
    );
    if (
      !esCompra &&
      idElemento &&
      (ventaConEstadisticas || ventaConCumplimientos) &&
      (
        normalizarMoneda(operacionAnterior.moneda) !== moneda ||
        numeroSeguro(
          operacionAnterior.valorDivisa,
          normalizarMoneda(operacionAnterior.moneda) === "ARS" ? 1 : Number.NaN,
        ) !== valorDivisa
      )
    ) {
      throw new Error(
        "La moneda y su cotización no pueden modificarse después del primer cumplimiento.",
      );
    }
    const datosOperacion = {
      ...data,
      estado,
      parcial,
      monto,
      descuento: numeroSeguro(data.descuento),
      valorDivisa,
      moneda,
    };
    delete datosOperacion.fecha;

    let acumuladosVenta = null;
    let huellaAnterior = null;
    let huellaNueva = null;
    if (!esCompra) {
      acumuladosVenta = await leerAcumuladosVenta(transaction, [
        operacionAnterior.estadisticas?.canal,
        datosOperacion.canal,
      ]);
      validarCanalSeleccionable(acumuladosVenta, datosOperacion.canal);
      huellaAnterior = operacionAnterior.estadisticas?.version
        ? operacionAnterior.estadisticas
        : null;
      huellaNueva = !idElemento || huellaAnterior
        ? calcularHuellaVenta({ venta: datosOperacion, detalles: nuevosNormalizados })
        : null;
      if (huellaNueva?.contabilizable === false) {
        throw new Error("La venta no tiene costos históricos completos para contabilizarse.");
      }
      if (huellaNueva) datosOperacion.estadisticas = huellaNueva;
    }

    if (asignacionPrincipal) {
      transaction.update(contadorPrincipalRef, asignacionPrincipal.contador);
    }

    if (!idElemento) {
      datosOperacion.fecha = serverTimestamp();
      datosOperacion.usuario = usuario;
      datosOperacion.modificaciones = [];
      datosOperacion.valorDolar = valorDolar;
      datosOperacion.ediciones = [];
      datosOperacion.detalleEstado = [
        {
          fecha: fechaCambio,
          usuario,
          estadoAnterior: null,
          estadoNuevo: estado,
          detalle: esAltaCompletada
            ? "Operación creada como cumplida"
            : "Operación creada pendiente",
        },
      ];
      transaction.set(doc(db, coleccion, operacionId), datosOperacion);
    } else {
      const cambios = edicionesEncabezado(
        operacionAnterior,
        datosOperacion,
        usuario,
        fechaCambio,
      );
      const estadoAnterior = operacionAnterior.estado || ESTADOS_OPERACION.COMPLETADA;
      const detalleEstado = [...(operacionAnterior.detalleEstado || [])];
      if (estado !== estadoAnterior) {
        detalleEstado.push({
          fecha: fechaCambio,
          usuario,
          estadoAnterior,
          estadoNuevo: estado,
          detalle: "Estado recalculado por edición de cantidades",
        });
      }
      transaction.update(doc(db, coleccion, operacionId), {
        ...datosOperacion,
        modificaciones: [
          ...(operacionAnterior.modificaciones || []),
          { fecha: fechaCambio, usuario },
        ],
        ediciones: [...(operacionAnterior.ediciones || []), ...cambios],
        ...(Array.isArray(operacionAnterior.modificaciones)
          ? {
              modificaciones: [
                ...operacionAnterior.modificaciones,
                ...(cambios.length
                  ? [{ fecha: fechaCambio, usuario, cambios }]
                  : []),
              ],
            }
          : {}),
        detalleEstado,
      });
    }

    const detallesNuevosSinId = nuevosNormalizados.filter((detalle) => !detalle.id);
    const asignacionDetalles = asignarCodigos(
      detailCollection,
      contadorDetalle.data(),
      detallesNuevosSinId.length,
    );
    if (detallesNuevosSinId.length) {
      transaction.update(contadorDetalleRef, asignacionDetalles.contador);
    }
    let indiceNuevo = 0;
    for (const detalle of nuevosNormalizados) {
      const anterior = originalesNormalizados.find((item) => item.id === detalle.id);
      const detalleLimpio = limpiarDetalle(detalle);
      detalleLimpio[detailRef] = operacionId;
      detalleLimpio.moneda = datosOperacion.moneda;
      if (anterior) {
        const cambios = edicionesDetalle(anterior, detalle, usuario, fechaCambio);
        transaction.update(doc(db, detailCollection, anterior.id), {
          ...detalleLimpio,
          ediciones: [...(anterior.ediciones || []), ...cambios],
        });
      } else {
        const detalleId = asignacionDetalles.codigos[indiceNuevo];
        indiceNuevo += 1;
        transaction.set(doc(db, detailCollection, detalleId), {
          ...detalleLimpio,
          fecha: serverTimestamp(),
          ediciones: [],
        });
      }
    }
    for (const anterior of originalesNormalizados) {
      if (!nuevosNormalizados.some((detalle) => detalle.id === anterior.id)) {
        transaction.update(doc(db, detailCollection, anterior.id), {
          activo: false,
          ediciones: [
            ...(anterior.ediciones || []),
            {
              fecha: fechaCambio,
              usuario,
              campo: "activo",
              valorAnterior: true,
              valorNuevo: false,
            },
          ],
        });
      }
    }

    const movimientoDetalles = [];
    for (const idProducto of idsProductos) {
      const producto = productos.get(idProducto);
      const anteriores = originalesNormalizados.filter(
        (detalle) => detalle.idProducto === idProducto,
      );
      const siguientes = nuevosNormalizados.filter(
        (detalle) => detalle.idProducto === idProducto,
      );
      const restanteAnterior = anteriores.reduce(
        (total, detalle) => total + cantidadRestante(detalle),
        0,
      );
      const restanteNuevo = siguientes.reduce(
        (total, detalle) => total + cantidadRestante(detalle),
        0,
      );
      const cambioObligacion = restanteNuevo - restanteAnterior;
      const actualizacion = {
        [campoObligacion]:
          numeroSeguro(producto.datos[campoObligacion]) + cambioObligacion,
      };
      if (actualizacion[campoObligacion] < 0) {
        throw new Error(`El campo ${campoObligacion} no puede quedar negativo.`);
      }

      const detalleActual = siguientes[0];
      const detalleAnterior = anteriores[0];
      const campoPrecio = esCompra ? "costo" : "precio";
      const campoMoneda = esCompra ? "monedaCosto" : "monedaPrecio";
      const debeActualizarPrecio =
        !idElemento ||
        !detalleAnterior ||
        String(detalleAnterior.precio) !== String(detalleActual?.precio) ||
        String(detalleAnterior.idProducto) !== String(detalleActual?.idProducto) ||
        producto.datos[campoMoneda] !== datosOperacion.moneda;
      if (detalleActual && debeActualizarPrecio) {
        const precioNuevo = numeroSeguro(detalleActual.precio);
        const precioAnterior = numeroSeguro(producto.datos[campoPrecio]);
        actualizacion[campoPrecio] = precioNuevo;
        actualizacion[campoMoneda] = datosOperacion.moneda;
        const edicionesProducto = [];
        if (precioAnterior !== precioNuevo) {
          edicionesProducto.push({
            fecha: fechaCambio,
            usuario,
            campo: campoPrecio,
            valorAnterior: precioAnterior,
            valorNuevo: precioNuevo,
          });
        }
        if (producto.datos[campoMoneda] !== datosOperacion.moneda) {
          edicionesProducto.push({
            fecha: fechaCambio,
            usuario,
            campo: campoMoneda,
            valorAnterior: producto.datos[campoMoneda] ?? null,
            valorNuevo: datosOperacion.moneda,
          });
        }
        if (edicionesProducto.length) {
          actualizacion.ediciones = [
            ...(producto.datos.ediciones || []),
            ...edicionesProducto,
          ];
        }
      }

      if (esAltaCompletada && detalleActual) {
        const diferencia = esCompra
          ? numeroSeguro(detalleActual.cantidad)
          : -numeroSeguro(detalleActual.cantidad);
        const stockAnterior = numeroSeguro(producto.datos.stock);
        const stockActualizado = aplicarMovimientoSucursal({
          producto: producto.datos,
          sucursalesDisponibles,
          sucursal: data.sucursal,
          diferencia,
        });
        if (!permitirNegativo && stockActualizado.stock < 0) {
          const error = new Error(
            `El stock resultante de ${producto.datos.descripcion || idProducto} será ${stockActualizado.stock}.`,
          );
          error.code = "stock-negativo";
          throw error;
        }
        Object.assign(actualizacion, stockActualizado);
        movimientoDetalles.push({
          idProducto,
          descripcion: producto.datos.descripcion || "",
          cantidad: diferencia,
          stockAnterior,
          stockNuevo: stockActualizado.stock,
        });
      } else if (!esCompra && !permitirNegativo) {
        const disponible =
          numeroSeguro(producto.datos.stock) - actualizacion.reservado;
        if (disponible < 0) {
          const error = new Error(
            `La disponibilidad de ${producto.datos.descripcion || idProducto} será ${disponible}.`,
          );
          error.code = "stock-negativo";
          throw error;
        }
      }

      transaction.update(producto.referencia, actualizacion);
    }

    if (movimientoDetalles.length) {
      const asignacionStock = asignarCodigos("stock", contadorStock.data(), 1);
      const asignacionDetalleStock = asignarCodigos(
        "detalleStock",
        contadorDetalleStock.data(),
        movimientoDetalles.length,
      );
      transaction.update(contadorStockRef, asignacionStock.contador);
      transaction.update(contadorDetalleStockRef, asignacionDetalleStock.contador);
      escribirMovimiento({
        transaction,
        movimiento: prepararMovimiento({
          operacionId,
          coleccion,
          sucursal: data.sucursal,
          usuario,
          detalles: movimientoDetalles,
        }),
        asignacionStock,
        asignacionDetalles: asignacionDetalleStock,
      });
    }

    if (!esCompra && huellaNueva) {
      aplicarDiferenciaSinEscriturasRedundantes({
        transaction,
        acumulados: acumuladosVenta,
        huellaAnterior,
        huellaNueva,
      });
    }

    return operacionId;
  });
}

const leerContadoresMovimiento = async (transaction, cantidadDetalles) => {
  const stockRef = doc(db, "contadores", "stock");
  const detalleStockRef = doc(db, "contadores", "detalleStock");
  const stockSnapshot = await transaction.get(stockRef);
  const detalleStockSnapshot = await transaction.get(detalleStockRef);
  if (!stockSnapshot.exists() || !detalleStockSnapshot.exists()) {
    throw new Error("No existen los contadores de movimientos de stock.");
  }
  return {
    stockRef,
    detalleStockRef,
    asignacionStock: asignarCodigos("stock", stockSnapshot.data(), 1),
    asignacionDetalles: asignarCodigos(
      "detalleStock",
      detalleStockSnapshot.data(),
      cantidadDetalles,
    ),
  };
};

export async function registrarCumplimiento({
  coleccion,
  operacion,
  cantidades,
  usuario,
  sucursalesDisponibles,
  permitirNegativo = false,
}) {
  validarUsuarioInterno(usuario);
  const esCompra = coleccion === "compras";
  const detalleColeccion = esCompra ? "detalleCompras" : "detalleVentas";
  const campoObligacion = esCompra ? "pendiente" : "reservado";
  const cantidadesPositivas = Object.entries(cantidades)
    .map(([detalleId, cantidad]) => ({ detalleId, cantidad: numeroSeguro(cantidad) }))
    .filter((item) => item.cantidad > 0);
  if (!cantidadesPositivas.length) {
    throw new Error("Informá al menos una cantidad a cumplir.");
  }
  const fechaCumplimiento = Timestamp.now();

  return runTransaction(db, async (transaction) => {
    const operacionRef = doc(db, coleccion, operacion.id);
    const operacionSnapshot = await transaction.get(operacionRef);
    if (!operacionSnapshot.exists()) throw new Error("La operación ya no existe.");
    const datosOperacion = operacionSnapshot.data();
    if (!datosOperacion.estado) {
      throw new Error("La operación histórica ya se considera completada.");
    }
    if (datosOperacion.estado === ESTADOS_OPERACION.ANULADA) {
      throw new Error("La operación está anulada.");
    }

    const detalles = [];
    for (const item of operacion[esCompra ? "detalleCompras" : "detalleVentas"] || []) {
      const referencia = doc(db, detalleColeccion, item.id);
      const snapshot = await transaction.get(referencia);
      if (snapshot.exists() && snapshot.data().activo !== false) {
        detalles.push({ referencia, id: item.id, datos: snapshot.data() });
      }
    }
    const productos = new Map();
    for (const detalle of detalles) {
      if (!productos.has(detalle.datos.idProducto)) {
        const referencia = doc(db, "productos", detalle.datos.idProducto);
        const snapshot = await transaction.get(referencia);
        if (!snapshot.exists()) {
          throw new Error(`No existe el producto ${detalle.datos.idProducto}.`);
        }
        productos.set(detalle.datos.idProducto, {
          referencia,
          datos: snapshot.data(),
        });
      }
    }
    const contadores = await leerContadoresMovimiento(
      transaction,
      cantidadesPositivas.length,
    );
    const huellaAnterior = !esCompra && datosOperacion.estadisticas?.version
      ? datosOperacion.estadisticas
      : null;
    const acumuladosVenta = huellaAnterior
      ? await leerAcumuladosVenta(transaction, [huellaAnterior.canal])
      : null;
    if (huellaAnterior) {
      validarCanalSeleccionable(acumuladosVenta, datosOperacion.canal);
    }

    const actualizacionesProducto = new Map();
    const movimientoDetalles = [];
    const detallesActualizados = [];
    for (const detalle of detalles) {
      const solicitado = numeroSeguro(cantidades[detalle.id]);
      const cantidad = numeroSeguro(detalle.datos.cantidad);
      const cumplidaAnterior = numeroSeguro(detalle.datos.cantidadCumplida);
      const restante = cantidad - cumplidaAnterior;
      if (solicitado < 0 || solicitado > restante) {
        throw new Error("La cantidad a cumplir supera la cantidad restante.");
      }
      const cumplidaNueva = cumplidaAnterior + solicitado;
      detallesActualizados.push({
        ...detalle.datos,
        cantidadCumplida: cumplidaNueva,
        ...(!esCompra && solicitado > 0
          ? {
              cumplimientos: [
                ...(detalle.datos.cumplimientos || []),
                { fecha: fechaCumplimiento, cantidad: solicitado },
              ],
            }
          : {}),
      });
      if (!solicitado) continue;

      const producto = productos.get(detalle.datos.idProducto);
      const acumulada = actualizacionesProducto.get(detalle.datos.idProducto) || {
        obligacion: numeroSeguro(producto.datos[campoObligacion]),
        productoActual: producto.datos,
      };
      acumulada.obligacion -= solicitado;
      if (acumulada.obligacion < 0) {
        throw new Error(`El campo ${campoObligacion} no puede quedar negativo.`);
      }
      const diferenciaStock = esCompra ? solicitado : -solicitado;
      const stockAnterior = numeroSeguro(acumulada.productoActual.stock);
      const stockActualizado = aplicarMovimientoSucursal({
        producto: acumulada.productoActual,
        sucursalesDisponibles,
        sucursal: datosOperacion.sucursal,
        diferencia: diferenciaStock,
      });
      if (!permitirNegativo && stockActualizado.stock < 0) {
        const error = new Error(
          `El stock resultante de ${producto.datos.descripcion || detalle.datos.idProducto} será ${stockActualizado.stock}.`,
        );
        error.code = "stock-negativo";
        throw error;
      }
      acumulada.productoActual = {
        ...acumulada.productoActual,
        ...stockActualizado,
      };
      actualizacionesProducto.set(detalle.datos.idProducto, acumulada);
      movimientoDetalles.push({
        idProducto: detalle.datos.idProducto,
        descripcion: producto.datos.descripcion || detalle.datos.descripcion || "",
        cantidad: diferenciaStock,
        stockAnterior,
        stockNuevo: stockActualizado.stock,
      });
      transaction.update(detalle.referencia, {
        cantidadCumplida: cumplidaNueva,
        ...(!esCompra && solicitado > 0
          ? {
              cumplimientos: [
                ...(detalle.datos.cumplimientos || []),
                { fecha: fechaCumplimiento, cantidad: solicitado },
              ],
            }
          : {}),
      });
    }

    for (const [idProducto, actualizacion] of actualizacionesProducto) {
      transaction.update(productos.get(idProducto).referencia, {
        [campoObligacion]: actualizacion.obligacion,
        stock: actualizacion.productoActual.stock,
        stockSucursal: actualizacion.productoActual.stockSucursal,
      });
    }

    const estadoAnterior = datosOperacion.estado || ESTADOS_OPERACION.COMPLETADA;
    const estadoNuevo = estadoSegunDetalles(detallesActualizados);
    const detalleEstado = [...(datosOperacion.detalleEstado || [])];
    if (estadoNuevo !== estadoAnterior) {
      detalleEstado.push({
        fecha: Timestamp.now(),
        usuario,
        estadoAnterior,
        estadoNuevo,
        detalle: "Cumplimiento de mercadería",
      });
    }
    const huellaNueva = huellaAnterior
      ? calcularHuellaVenta({ venta: datosOperacion, detalles: detallesActualizados })
      : null;
    transaction.update(operacionRef, {
      estado: estadoNuevo,
      detalleEstado,
      ...(huellaNueva ? { estadisticas: huellaNueva } : {}),
    });

    transaction.update(contadores.stockRef, contadores.asignacionStock.contador);
    transaction.update(
      contadores.detalleStockRef,
      contadores.asignacionDetalles.contador,
    );
    escribirMovimiento({
      transaction,
      movimiento: prepararMovimiento({
        operacionId: operacion.id,
        coleccion,
        sucursal: datosOperacion.sucursal,
        usuario,
        detalles: movimientoDetalles,
      }),
      asignacionStock: contadores.asignacionStock,
      asignacionDetalles: contadores.asignacionDetalles,
    });
    if (huellaNueva) {
      aplicarDiferenciaSinEscriturasRedundantes({
        transaction,
        acumulados: acumuladosVenta,
        huellaAnterior,
        huellaNueva,
      });
    }
  });
}

const serializarAnulacionDebug = (valor) => JSON.stringify(
  normalizarValorDebug(valor),
);

const normalizarValorDebug = (valor) => {
  if (valor instanceof Date) {
    return { tipo: "Date", iso: valor.toISOString() };
  }
  if (
    valor
    && typeof valor.toDate === "function"
    && typeof valor.seconds === "number"
    && typeof valor.nanoseconds === "number"
  ) {
    return {
      tipo: "Timestamp",
      seconds: valor.seconds,
      nanoseconds: valor.nanoseconds,
      iso: valor.toDate().toISOString(),
    };
  }
  if (Array.isArray(valor)) return valor.map(normalizarValorDebug);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, dato]) => [
        clave,
        normalizarValorDebug(dato),
      ]),
    );
  }
  return valor;
};

export async function anularOperacion({
  coleccion,
  operacion,
  motivo,
  usuario,
  reingresarVenta = false,
  sucursalesDisponibles,
  permitirNegativo = false,
}) {
  validarUsuarioInterno(usuario);
  if (!motivo?.trim()) throw new Error("El motivo de anulación es obligatorio.");
  const esCompra = coleccion === "compras";
  const detalleColeccion = esCompra ? "detalleCompras" : "detalleVentas";
  const nombreDetalles = esCompra ? "detalleCompras" : "detalleVentas";
  const campoObligacion = esCompra ? "pendiente" : "reservado";

  return runTransaction(db, async (transaction) => {
    const operacionRef = doc(db, coleccion, operacion.id);
    const operacionSnapshot = await transaction.get(operacionRef);
    if (!operacionSnapshot.exists()) throw new Error("La operación ya no existe.");
    const datosOperacion = operacionSnapshot.data();
    console.log(
      `[ANULACION DEBUG] Venta completa JSON ${serializarAnulacionDebug(datosOperacion)}`,
    );
    if (datosOperacion.estado === ESTADOS_OPERACION.ANULADA) {
      throw new Error("La operación ya está anulada.");
    }

    const detalles = [];
    for (const item of operacion[nombreDetalles] || []) {
      const referencia = doc(db, detalleColeccion, item.id);
      const snapshot = await transaction.get(referencia);
      if (snapshot.exists() && snapshot.data().activo !== false) {
        detalles.push({ referencia, datos: snapshot.data() });
      }
    }
    const productos = new Map();
    for (const detalle of detalles) {
      const idProducto = detalle.datos.idProducto;
      if (!productos.has(idProducto)) {
        const referencia = doc(db, "productos", idProducto);
        const snapshot = await transaction.get(referencia);
        if (!snapshot.exists()) throw new Error(`No existe el producto ${idProducto}.`);
        console.log(
          `[ANULACION DEBUG] Producto completo JSON ${serializarAnulacionDebug({
            id: idProducto,
            data: snapshot.data(),
          })}`,
        );
        productos.set(idProducto, { referencia, datos: snapshot.data() });
      }
    }
    const detallesReingreso = !esCompra && reingresarVenta
      ? detalles.filter((detalle) => numeroSeguro(detalle.datos.cantidadCumplida) > 0)
      : [];
    const contadores = detallesReingreso.length
      ? await leerContadoresMovimiento(transaction, detallesReingreso.length)
      : null;
    const huellaAnterior = !esCompra && datosOperacion.estadisticas?.version
      ? datosOperacion.estadisticas
      : null;
    const acumuladosVenta = huellaAnterior
      ? await leerAcumuladosVenta(transaction, [huellaAnterior.canal])
      : null;
    const huellaNueva = huellaAnterior && reingresarVenta
      ? calcularHuellaVenta({
          venta: datosOperacion,
          detalles: detalles.map((detalle) => ({
            ...detalle.datos,
            cumplimientos: [],
          })),
        })
      : huellaAnterior;

    const movimientoDetalles = [];
    for (const detalle of detalles) {
      const idProducto = detalle.datos.idProducto;
      const producto = productos.get(idProducto);
      const detalleCompatible = datosOperacion.estado
        ? detalle.datos
        : { ...detalle.datos, cantidadCumplida: detalle.datos.cantidad };
      const restante = cantidadRestante(detalleCompatible);
      const actualizacion = {
        [campoObligacion]:
          numeroSeguro(producto.datos[campoObligacion]) - restante,
      };
      if (actualizacion[campoObligacion] < 0) {
        throw new Error(`El campo ${campoObligacion} no puede quedar negativo.`);
      }
      if (!esCompra && reingresarVenta) {
        const cumplida = numeroSeguro(detalleCompatible.cantidadCumplida);
        if (cumplida > 0) {
          const stockAnterior = numeroSeguro(producto.datos.stock);
          const stockActualizado = aplicarMovimientoSucursal({
            producto: producto.datos,
            sucursalesDisponibles,
            sucursal: datosOperacion.sucursal,
            diferencia: cumplida,
          });
          if (!permitirNegativo && stockActualizado.stock < 0) {
            const error = new Error("El reingreso produciría stock inválido.");
            error.code = "stock-negativo";
            throw error;
          }
          Object.assign(actualizacion, stockActualizado);
          movimientoDetalles.push({
            idProducto,
            descripcion: producto.datos.descripcion || "",
            cantidad: cumplida,
            stockAnterior,
            stockNuevo: stockActualizado.stock,
          });
        }
      }
      console.log(
        `[ANULACION DEBUG] Patch producto JSON ${serializarAnulacionDebug({
          id: idProducto,
          patch: actualizacion,
        })}`,
      );
      transaction.update(producto.referencia, actualizacion);
    }

    const actualizacionOperacion = {
      estado: ESTADOS_OPERACION.ANULADA,
      ...(huellaNueva ? { estadisticas: huellaNueva } : {}),
      detalleEstado: [
        ...(datosOperacion.detalleEstado || []),
        {
          fecha: Timestamp.now(),
          usuario,
          estadoAnterior: datosOperacion.estado || ESTADOS_OPERACION.COMPLETADA,
          estadoNuevo: ESTADOS_OPERACION.ANULADA,
          detalle: motivo.trim(),
        },
      ],
    };
    console.log(
      `[ANULACION DEBUG] Patch venta JSON ${serializarAnulacionDebug(actualizacionOperacion)}`,
    );
    transaction.update(operacionRef, actualizacionOperacion);

    if (contadores && movimientoDetalles.length) {
      transaction.update(contadores.stockRef, contadores.asignacionStock.contador);
      transaction.update(
        contadores.detalleStockRef,
        contadores.asignacionDetalles.contador,
      );
      escribirMovimiento({
        transaction,
        movimiento: {
          tipo: TIPOS_MOVIMIENTO.REINGRESO,
          sucursal: datosOperacion.sucursal,
          detalle: `Reingreso por anulación de venta ${operacion.id}`,
          usuario,
          origenTipo: coleccion,
          origenId: operacion.id,
          detalles: movimientoDetalles,
        },
        asignacionStock: contadores.asignacionStock,
        asignacionDetalles: contadores.asignacionDetalles,
      });
    }
    if (huellaAnterior && reingresarVenta) {
      aplicarDiferenciaSinEscriturasRedundantes({
        transaction,
        acumulados: acumuladosVenta,
        huellaAnterior,
        huellaNueva,
      });
    }
  });
}

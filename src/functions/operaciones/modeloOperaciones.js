export const ESTADOS_OPERACION = {
  PENDIENTE: "PENDIENTE",
  PARCIAL: "PARCIAL",
  COMPLETADA: "COMPLETADA",
  ANULADA: "ANULADA",
};

export const TIPOS_MOVIMIENTO = {
  INGRESO: "INGRESO",
  EGRESO: "EGRESO",
  AJUSTE: "AJUSTE",
  TRANSFERENCIA: "TRANSFERENCIA",
  REINGRESO: "REINGRESO",
};

export const TIPOS_MOVIMIENTO_MANUAL = [
  TIPOS_MOVIMIENTO.INGRESO,
  TIPOS_MOVIMIENTO.EGRESO,
  TIPOS_MOVIMIENTO.AJUSTE,
];

export const normalizarTipoMovimiento = (tipo) => {
  const valor = String(tipo || "").toUpperCase();
  if (valor === "ALTA") return TIPOS_MOVIMIENTO.INGRESO;
  if (valor === "BAJA") return TIPOS_MOVIMIENTO.EGRESO;
  return valor;
};

export const SUCURSAL_HISTORICA = "SC-A0001";

export const numeroSeguro = (valor, fallback = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
};

export const cantidadRestante = (detalle) =>
  Math.max(
    numeroSeguro(detalle?.cantidad) - numeroSeguro(detalle?.cantidadCumplida),
    0,
  );

export const estadoSegunDetalles = (detalles = []) => {
  const total = detalles.reduce(
    (acumulado, detalle) => acumulado + numeroSeguro(detalle.cantidad),
    0,
  );
  const cumplido = detalles.reduce(
    (acumulado, detalle) =>
      acumulado + numeroSeguro(detalle.cantidadCumplida),
    0,
  );

  if (total > 0 && cumplido >= total) return ESTADOS_OPERACION.COMPLETADA;
  if (cumplido > 0) return ESTADOS_OPERACION.PARCIAL;
  return ESTADOS_OPERACION.PENDIENTE;
};

export const estadoVisible = (operacion) =>
  operacion?.estado || ESTADOS_OPERACION.COMPLETADA;

export const calcularMontos = (detalles = [], descuento = 0) => {
  const parcial = detalles.reduce(
    (acumulado, detalle) =>
      acumulado +
      numeroSeguro(detalle.cantidad) * numeroSeguro(detalle.precio),
    0,
  );
  const porcentaje = numeroSeguro(descuento);
  return {
    parcial,
    monto: parcial - (parcial * porcentaje) / 100,
  };
};

export const normalizarStockSucursal = (
  producto,
  sucursalesDisponibles,
  sucursalMovimiento,
) => {
  const stockSucursal = producto?.stockSucursal;
  const valido =
    Array.isArray(stockSucursal) &&
    stockSucursal.length > 0 &&
    stockSucursal.every(
      (item) =>
        item &&
        typeof item.sucursal === "string" &&
        Number.isFinite(Number(item.stock)),
    );

  if (valido) {
    return stockSucursal.map((item) => ({
      sucursal: item.sucursal,
      stock: numeroSeguro(item.stock),
    }));
  }

  if (
    sucursalMovimiento !== SUCURSAL_HISTORICA ||
    !sucursalesDisponibles.includes(SUCURSAL_HISTORICA)
  ) {
    throw new Error(
      "El producto no tiene distribución por sucursal. Definila antes de realizar el movimiento.",
    );
  }

  return [
    {
      sucursal: SUCURSAL_HISTORICA,
      stock: numeroSeguro(producto?.stock),
    },
  ];
};

export const actualizarStockSucursal = (distribucion, sucursal, diferencia) => {
  const existente = distribucion.find((item) => item.sucursal === sucursal);
  const actualizada = existente
    ? distribucion.map((item) =>
        item.sucursal === sucursal
          ? { ...item, stock: numeroSeguro(item.stock) + diferencia }
          : item,
      )
    : [...distribucion, { sucursal, stock: diferencia }];

  return {
    stockSucursal: actualizada,
    stock: actualizada.reduce(
      (total, item) => total + numeroSeguro(item.stock),
      0,
    ),
  };
};

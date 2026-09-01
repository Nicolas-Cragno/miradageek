export const MAX_PRODUCTOS_MOVIMIENTO_STOCK = 8;

export const MENSAJE_LIMITE_PRODUCTOS_MOVIMIENTO_STOCK =
  "Podés incluir hasta 8 productos por movimiento de stock.";

export const excedeLimiteProductosMovimientoStock = (detalles) =>
  Array.isArray(detalles) &&
  detalles.length > MAX_PRODUCTOS_MOVIMIENTO_STOCK;

export const puedeAgregarProductoMovimientoStock = (detalles, idProducto) => {
  const listado = Array.isArray(detalles) ? detalles : [];
  const yaIncluido = listado.some(
    (detalle) => String(detalle.idProducto) === String(idProducto),
  );
  return yaIncluido || listado.length < MAX_PRODUCTOS_MOVIMIENTO_STOCK;
};

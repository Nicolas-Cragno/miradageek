export function defaultsProducto() {
  return {
    descripcion: null, tipo: null, marca: null, costo: null, monedaCosto: null,
    precio: null, monedaPrecio: null, stock: 0, stockSucursal: [],
    reservado: 0, pendiente: 0, fecha: null, ediciones: [],
  };
}

export function prepararProductoNuevo(datos = {}) {
  const permitidos = new Set([...Object.keys(defaultsProducto()), 'id', 'imagen']);
  for (const campo of Object.keys(datos)) {
    if (!permitidos.has(campo)) throw new Error(`Campo de producto no permitido: ${campo}.`);
  }
  const producto = { ...defaultsProducto(), ...Object.fromEntries(
    Object.entries(datos).filter(([, valor]) => valor !== undefined),
  ) };
  for (const campo of ['monedaCosto', 'monedaPrecio']) {
    if (producto[campo] === 'pesos') producto[campo] = 'ARS';
    if (producto[campo] !== null && !['ARS', 'USD'].includes(producto[campo])) {
      throw new Error(`${campo}: debe ser ARS, USD o null.`);
    }
  }
  producto.reservado = 0;
  producto.pendiente = 0;
  producto.ediciones = [];
  producto.stock ??= 0;
  producto.stockSucursal ??= [];
  if (typeof producto.stock !== 'number' || !Number.isFinite(producto.stock)) {
    throw new Error('stock: debe ser un numero finito.');
  }
  if (!Array.isArray(producto.stockSucursal)) throw new Error('stockSucursal: debe ser una lista.');
  if (producto.stock === 0) producto.stockSucursal = [];
  return producto;
}

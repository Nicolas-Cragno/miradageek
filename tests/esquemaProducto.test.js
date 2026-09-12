import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultsProducto, prepararProductoNuevo } from '../src/functions/productos/esquemaProducto.js';
import { calcularCambios, crearInforme, registrarProducto } from '../src/firebase/scripts/politicaNormalizacionProductos.js';

test('alta vacia contiene los 13 campos sin inferir datos comerciales', () => {
  const nuevo = prepararProductoNuevo({ monedaCosto: undefined });
  assert.deepEqual(nuevo, defaultsProducto());
  assert.equal(Object.keys(nuevo).length, 13);
});

test('alta limita extras a id e imagen y completa null operativos', () => {
  assert.throws(() => prepararProductoNuevo({ label: 'no persistir' }), /no permitido/);
  const nuevo = prepararProductoNuevo({ id: 'PR-A1', imagen: 'foto.png', stock: null, stockSucursal: null });
  assert.equal(nuevo.id, 'PR-A1');
  assert.equal(nuevo.imagen, 'foto.png');
  assert.equal(nuevo.stock, 0);
  assert.deepEqual(nuevo.stockSucursal, []);
  assert.throws(() => prepararProductoNuevo({ stock: '3' }), /numero/);
  assert.throws(() => prepararProductoNuevo({ stockSucursal: {} }), /lista/);
});

test('alta conserva datos comerciales y fecha, sin inferir monedas por importe', () => {
  const fecha = new Date('2026-09-11T00:00:00Z');
  const datos = { descripcion: 'Producto', tipo: 'ACC', marca: 'Marca',
    costo: 2000, precio: 1, monedaCosto: 'USD', monedaPrecio: 'ARS', fecha };
  const nuevo = prepararProductoNuevo(datos);
  for (const campo of Object.keys(datos)) assert.equal(nuevo[campo], datos[campo]);
  assert.equal(prepararProductoNuevo({ costo: 99999 }).monedaCosto, null);
});

test('alta conserva stock provisto y fuerza auditoria inicial', () => {
  const datos = { stock: 4, stockSucursal: [{ sucursal: 'S1', stock: 4 }],
    costo: 99999, precio: 1, reservado: 8, pendiente: 2, ediciones: [{ campo: 'precio' }] };
  const nuevo = prepararProductoNuevo(datos);
  assert.equal(nuevo.monedaCosto, null);
  assert.equal(nuevo.monedaPrecio, null);
  assert.equal(nuevo.stock, 4);
  assert.deepEqual(nuevo.stockSucursal, datos.stockSucursal);
  assert.equal(nuevo.reservado, 0);
  assert.equal(nuevo.pendiente, 0);
  assert.deepEqual(nuevo.ediciones, []);
  assert.equal(datos.reservado, 8);
  assert.throws(() => prepararProductoNuevo({ monedaCosto: 'EUR' }));
});

test('normalizacion solo agrega ausentes y convierte pesos, es idempotente', () => {
  const datos = { costo: 50000, precio: 5, monedaCosto: 'pesos', marca: null,
    stock: 12, reservado: 3, ediciones: [{ campo: 'costo' }] };
  const antes = structuredClone(datos);
  const cambios = calcularCambios(datos);
  const resultante = { ...datos, ...Object.fromEntries(Object.entries(cambios).map(([k,v]) => [k,v.nuevo])) };
  assert.equal(resultante.monedaCosto, 'ARS');
  assert.equal(resultante.monedaPrecio, null);
  assert.equal(resultante.stock, 12);
  assert.equal(resultante.reservado, 3);
  assert.deepEqual(resultante.ediciones, datos.ediciones);
  assert.deepEqual(calcularCambios(resultante), {});
  assert.deepEqual(datos, antes);
  assert.ok(Object.keys(defaultsProducto()).every(k => Object.hasOwn(resultante,k)));
});

test('dry run cuenta faltantes por campo y documentos completos', () => {
  const informe = crearInforme();
  registrarProducto(informe, 'vacio', calcularCambios({}));
  registrarProducto(informe, 'completo', calcularCambios(defaultsProducto()));
  assert.equal(informe.totalProductos, 2);
  assert.equal(informe.productosAModificar, 1);
  assert.equal(informe.completosAntes, 1);
  assert.equal(informe.completosDespues, 2);
  assert.ok(Object.values(informe.faltantesPorCampo).every(n => n === 1));
  assert.equal(informe.ejemplos.length, 2);
});

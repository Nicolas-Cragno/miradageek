import assert from "node:assert/strict";
import test from "node:test";

import {
  excedeLimiteProductosMovimientoStock,
  MAX_PRODUCTOS_MOVIMIENTO_STOCK,
  puedeAgregarProductoMovimientoStock,
} from "../src/functions/operaciones/limitesMovimientoStock.js";

const detalles = (cantidad) =>
  Array.from({ length: cantidad }, (_, indice) => ({
    idProducto: `PR-${indice + 1}`,
  }));

test("permite agregar hasta ocho productos distintos", () => {
  assert.equal(MAX_PRODUCTOS_MOVIMIENTO_STOCK, 8);
  assert.equal(puedeAgregarProductoMovimientoStock(detalles(7), "PR-8"), true);
});

test("impide agregar un noveno producto distinto", () => {
  assert.equal(puedeAgregarProductoMovimientoStock(detalles(8), "PR-9"), false);
});

test("permite actualizar un producto ya incluido aunque la lista tenga ocho", () => {
  assert.equal(puedeAgregarProductoMovimientoStock(detalles(8), "PR-8"), true);
});

test("detecta una lista fuera de límite al guardar", () => {
  assert.equal(excedeLimiteProductosMovimientoStock(detalles(8)), false);
  assert.equal(excedeLimiteProductosMovimientoStock(detalles(9)), true);
});

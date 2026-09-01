import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizarStockSucursal,
  SUCURSAL_HISTORICA,
} from "../src/functions/operaciones/modeloOperaciones.js";

const OTRA_SUCURSAL = "SC-A0002";

test("permite stock legacy en la sucursal histórica aunque existan varias sucursales", () => {
  const distribucion = normalizarStockSucursal(
    { stock: 12 },
    [SUCURSAL_HISTORICA, OTRA_SUCURSAL],
    SUCURSAL_HISTORICA,
  );

  assert.deepEqual(distribucion, [
    { sucursal: SUCURSAL_HISTORICA, stock: 12 },
  ]);
  assert.equal(
    distribucion.reduce((total, item) => total + item.stock, 0),
    12,
  );
});

test("rechaza stock legacy si el movimiento pertenece a otra sucursal", () => {
  assert.throws(
    () =>
      normalizarStockSucursal(
        { stock: 12 },
        [SUCURSAL_HISTORICA, OTRA_SUCURSAL],
        OTRA_SUCURSAL,
      ),
    /El producto no tiene distribución por sucursal/,
  );
});

test("conserva una distribución válida y normaliza sus valores numéricos", () => {
  const producto = {
    stock: 12,
    stockSucursal: [
      { sucursal: SUCURSAL_HISTORICA, stock: "7" },
      { sucursal: OTRA_SUCURSAL, stock: 5 },
    ],
  };

  assert.deepEqual(
    normalizarStockSucursal(producto, [], OTRA_SUCURSAL),
    [
      { sucursal: SUCURSAL_HISTORICA, stock: 7 },
      { sucursal: OTRA_SUCURSAL, stock: 5 },
    ],
  );
});

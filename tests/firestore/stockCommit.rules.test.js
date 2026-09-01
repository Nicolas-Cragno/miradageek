import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after, before, beforeEach } from "node:test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-geek-look-stock";
const UID = "gestorStockUid";
const USUARIO_ID = "US-A0004";
const PRODUCTOS = 10;

let testEnv;

const productoLegacy = (indice) => ({
  id: `PR-A${String(indice).padStart(8, "0")}`,
  descripcion: `Producto ${indice}`,
  monedaCosto: "ARS",
  monedaPrecio: "ARS",
  costo: 1,
  precio: 1,
  stock: 1,
});

const productoLegacyConMonedaPesos = {
  id: "PR-A00000003",
  descripcion: "Batman: The Animated Series - 4pc Deluxe Set batman",
  tipo: "FGR",
  marca: "",
  costo: 0,
  monedaCosto: "pesos",
  precio: 39000,
  monedaPrecio: "pesos",
  imagen: "",
  stock: 1,
};

const productoLegacyIncompleto = {
  costo: null,
  descripcion: "Blokees saint seiya galaxy version 03 gold zodiac",
  marca: "Blokees",
  precio: 169000,
  stock: 1,
  tipo: "MDK",
};

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const semillas = [
      setDoc(doc(db, "accesosUsuarios", UID), {
        usuarioId: USUARIO_ID,
        tipo: "02",
        estado: true,
      }),
      setDoc(doc(db, "contadores", "stock"), {
        id: "stock",
        serie: "A",
        ultimo: 65,
      }),
      setDoc(doc(db, "contadores", "detalleStock"), {
        id: "detalleStock",
        serie: "A",
        ultimo: 100,
      }),
    ];
    for (let indice = 1; indice <= PRODUCTOS; indice += 1) {
      const producto = productoLegacy(indice);
      semillas.push(setDoc(doc(db, "productos", producto.id), producto));
    }
    await Promise.all(semillas);
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test("permite agregar stockSucursal a un producto legacy válido", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.doesNotReject(
    setDoc(
      doc(db, "productos", productoLegacy(1).id),
      {
        stock: 0,
        stockSucursal: [{ sucursal: "SC-A0001", stock: 0 }],
      },
      { merge: true },
    ),
  );
});

test("permite update sólo de stock para producto con monedas legacy", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", productoLegacyConMonedaPesos.id),
      productoLegacyConMonedaPesos,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.doesNotReject(
    setDoc(
      doc(db, "productos", productoLegacyConMonedaPesos.id),
      {
        stock: 0,
        stockSucursal: [{ sucursal: "SC-A0001", stock: 0 }],
      },
      { merge: true },
    ),
  );
});

test("rechaza cambiar stock y monedaPrecio en un producto legacy", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", productoLegacyConMonedaPesos.id),
      productoLegacyConMonedaPesos,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.rejects(
    setDoc(
      doc(db, "productos", productoLegacyConMonedaPesos.id),
      { stock: 0, monedaPrecio: "ARS" },
      { merge: true },
    ),
  );
});

test("rechaza agregar un campo arbitrario durante update de stock legacy", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", productoLegacyConMonedaPesos.id),
      productoLegacyConMonedaPesos,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.rejects(
    setDoc(
      doc(db, "productos", productoLegacyConMonedaPesos.id),
      { stock: 0, campoArbitrario: true },
      { merge: true },
    ),
  );
});

test("permite update normal de stock para producto moderno", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.doesNotReject(
    setDoc(
      doc(db, "productos", productoLegacy(1).id),
      {
        stock: 0,
        stockSucursal: [{ sucursal: "SC-A0001", stock: 0 }],
      },
      { merge: true },
    ),
  );
});

test("rechaza una edición general de producto con monedas legacy", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", productoLegacyConMonedaPesos.id),
      productoLegacyConMonedaPesos,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.rejects(
    setDoc(
      doc(db, "productos", productoLegacyConMonedaPesos.id),
      { descripcion: "Descripción editada" },
      { merge: true },
    ),
  );
});

test("rechaza crear un producto nuevo con monedas legacy", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.rejects(
    setDoc(
      doc(db, "productos", "PR-NUEVO-PESOS"),
      { ...productoLegacyConMonedaPesos, id: "PR-NUEVO-PESOS" },
    ),
  );
});

test("rechaza cambiar una moneda moderna hacia 'pesos'", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.rejects(
    setDoc(
      doc(db, "productos", productoLegacy(1).id),
      { monedaPrecio: "pesos" },
      { merge: true },
    ),
  );
});

test("permite stock y stockSucursal en producto legacy sin monedas", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", "PR-A00000104"),
      productoLegacyIncompleto,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.doesNotReject(
    setDoc(
      doc(db, "productos", "PR-A00000104"),
      {
        stock: 0,
        stockSucursal: [{ sucursal: "SC-A0001", stock: 0 }],
      },
      { merge: true },
    ),
  );
});

test("rechaza agregar monedaCosto durante update de stock legacy incompleto", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", "PR-A00000104"),
      productoLegacyIncompleto,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.rejects(
    setDoc(
      doc(db, "productos", "PR-A00000104"),
      { stock: 0, monedaCosto: "ARS" },
      { merge: true },
    ),
  );
});

test("rechaza agregar monedaPrecio durante update de stock legacy incompleto", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", "PR-A00000104"),
      productoLegacyIncompleto,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.rejects(
    setDoc(
      doc(db, "productos", "PR-A00000104"),
      { stock: 0, monedaPrecio: "ARS" },
      { merge: true },
    ),
  );
});

test("rechaza cambiar costo null durante update de stock legacy incompleto", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", "PR-A00000104"),
      productoLegacyIncompleto,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.rejects(
    setDoc(
      doc(db, "productos", "PR-A00000104"),
      { stock: 0, costo: 1 },
      { merge: true },
    ),
  );
});

test("rechaza campo arbitrario durante update de stock legacy incompleto", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", "PR-A00000104"),
      productoLegacyIncompleto,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.rejects(
    setDoc(
      doc(db, "productos", "PR-A00000104"),
      { stock: 0, campoArbitrario: true },
      { merge: true },
    ),
  );
});

test("rechaza edición general de producto legacy incompleto", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "productos", "PR-A00000104"),
      productoLegacyIncompleto,
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.rejects(
    setDoc(
      doc(db, "productos", "PR-A00000104"),
      { descripcion: "Descripción editada" },
      { merge: true },
    ),
  );
});

test("rechaza CREATE con schema legacy incompleto", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.rejects(
    setDoc(
      doc(db, "productos", "PR-NUEVO-INCOMPLETO"),
      productoLegacyIncompleto,
    ),
  );
});

test("B: permite create de encabezado stock AJUSTE", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.doesNotReject(
    setDoc(doc(db, "stock", "ST-A00000066"), {
      id: "ST-A00000066",
      sucursal: "SC-A0001",
      detalle: "Ajuste manual",
      tipo: "AJUSTE",
      usuario: USUARIO_ID,
      origenTipo: "manual",
      origenId: "",
      fecha: serverTimestamp(),
    }),
  );
});

test("C: permite create de detalleStock AJUSTE", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.doesNotReject(
    setDoc(doc(db, "detalleStock", "DS-A00000101"), {
      stock: "ST-A00000066",
      idProducto: "PR-A00000003",
      descripcion: "Batman",
      cantidad: -1,
      stockAnterior: 1,
      stockNuevo: 0,
      tipo: "AJUSTE",
      fecha: serverTimestamp(),
    }),
  );
});

test("D: permite update de contadores/stock", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.doesNotReject(
    runTransaction(db, async (transaction) => {
      const referencia = doc(db, "contadores", "stock");
      await transaction.get(referencia);
      transaction.update(referencia, { serie: "A", ultimo: 66 });
    }),
  );
});

test("E: permite update de contadores/detalleStock", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await assert.doesNotReject(
    runTransaction(db, async (transaction) => {
      const referencia = doc(db, "contadores", "detalleStock");
      await transaction.get(referencia);
      transaction.update(referencia, { serie: "A", ultimo: 103 });
    }),
  );
});

test("permite commit manual completo con tres productos legacy", async () => {
  const ids = ["PR-A00000003", "PR-A00000007", "PR-A00000008"];
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(
      ids.map((id, indice) =>
        setDoc(doc(db, "productos", id), {
          ...productoLegacyConMonedaPesos,
          id,
          descripcion: `Producto legacy ${indice + 1}`,
        }),
      ),
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.doesNotReject(
    runTransaction(db, async (transaction) => {
      const stockRef = doc(db, "contadores", "stock");
      const detalleStockRef = doc(db, "contadores", "detalleStock");
      await transaction.get(stockRef);
      await transaction.get(detalleStockRef);
      const productos = [];
      for (const id of ids) {
        const referencia = doc(db, "productos", id);
        await transaction.get(referencia);
        productos.push(referencia);
      }

      for (const referencia of productos) {
        transaction.update(referencia, {
          stock: 0,
          stockSucursal: [{ sucursal: "SC-A0001", stock: 0 }],
        });
      }
      transaction.update(stockRef, { serie: "A", ultimo: 66 });
      transaction.update(detalleStockRef, { serie: "A", ultimo: 103 });
      transaction.set(doc(db, "stock", "ST-A00000066"), {
        id: "ST-A00000066",
        sucursal: "SC-A0001",
        detalle: "Ajuste manual",
        tipo: "AJUSTE",
        usuario: USUARIO_ID,
        origenTipo: "manual",
        origenId: "",
        fecha: serverTimestamp(),
      });
      ids.forEach((id, indice) => {
        transaction.set(
          doc(db, "detalleStock", `DS-A${String(101 + indice).padStart(8, "0")}`),
          {
            stock: "ST-A00000066",
            idProducto: id,
            descripcion: `Producto legacy ${indice + 1}`,
            cantidad: -1,
            stockAnterior: 1,
            stockNuevo: 0,
            tipo: "AJUSTE",
            fecha: serverTimestamp(),
          },
        );
      });
    }),
  );
});

test("permite commit manual con varios productos legacy incompletos", async () => {
  const ids = ["PR-A00000104", "PR-A00000105", "PR-A00000106"];
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(
      ids.map((id, indice) =>
        setDoc(doc(db, "productos", id), {
          ...productoLegacyIncompleto,
          descripcion: `${productoLegacyIncompleto.descripcion} ${indice + 1}`,
        }),
      ),
    );
  });
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.doesNotReject(
    runTransaction(db, async (transaction) => {
      const stockRef = doc(db, "contadores", "stock");
      const detalleStockRef = doc(db, "contadores", "detalleStock");
      await transaction.get(stockRef);
      await transaction.get(detalleStockRef);
      const productos = [];
      for (const id of ids) {
        const referencia = doc(db, "productos", id);
        await transaction.get(referencia);
        productos.push(referencia);
      }

      productos.forEach((referencia) => {
        transaction.update(referencia, {
          stock: 0,
          stockSucursal: [{ sucursal: "SC-A0001", stock: 0 }],
        });
      });
      transaction.update(stockRef, { serie: "A", ultimo: 66 });
      transaction.update(detalleStockRef, { serie: "A", ultimo: 103 });
      transaction.set(doc(db, "stock", "ST-A00000066"), {
        id: "ST-A00000066",
        sucursal: "SC-A0001",
        detalle: "Ajuste manual",
        tipo: "AJUSTE",
        usuario: USUARIO_ID,
        origenTipo: "manual",
        origenId: "",
        fecha: serverTimestamp(),
      });
      ids.forEach((id, indice) => {
        transaction.set(
          doc(db, "detalleStock", `DS-A${String(101 + indice).padStart(8, "0")}`),
          {
            stock: "ST-A00000066",
            idProducto: id,
            descripcion: `${productoLegacyIncompleto.descripcion} ${indice + 1}`,
            cantidad: -1,
            stockAnterior: 1,
            stockNuevo: 0,
            tipo: "AJUSTE",
            fecha: serverTimestamp(),
          },
        );
      });
    }),
  );
});

test("permite el commit manual de 10 productos y 23 writes", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();

  await assert.doesNotReject(
    runTransaction(db, async (transaction) => {
      const stockRef = doc(db, "contadores", "stock");
      const detalleStockRef = doc(db, "contadores", "detalleStock");
      await transaction.get(stockRef);
      await transaction.get(detalleStockRef);

      const productos = [];
      for (let indice = 1; indice <= PRODUCTOS; indice += 1) {
        const referencia = doc(db, "productos", productoLegacy(indice).id);
        await transaction.get(referencia);
        productos.push(referencia);
      }

      for (let indice = 0; indice < PRODUCTOS; indice += 1) {
        transaction.update(productos[indice], {
          stock: 0,
          stockSucursal: [{ sucursal: "SC-A0001", stock: 0 }],
        });
      }
      transaction.update(stockRef, { serie: "A", ultimo: 66 });
      transaction.update(detalleStockRef, { serie: "A", ultimo: 110 });
      transaction.set(doc(db, "stock", "ST-A00000066"), {
        id: "ST-A00000066",
        sucursal: "SC-A0001",
        detalle: "Ajuste manual",
        tipo: "AJUSTE",
        usuario: USUARIO_ID,
        origenTipo: "manual",
        origenId: "",
        fecha: serverTimestamp(),
      });
      for (let indice = 1; indice <= PRODUCTOS; indice += 1) {
        transaction.set(
          doc(db, "detalleStock", `DS-A${String(100 + indice).padStart(8, "0")}`),
          {
            stock: "ST-A00000066",
            idProducto: productoLegacy(indice).id,
            descripcion: `Producto ${indice}`,
            cantidad: -1,
            stockAnterior: 1,
            stockNuevo: 0,
            tipo: "AJUSTE",
            fecha: serverTimestamp(),
          },
        );
      }
    }),
  );
});

test("rechaza individualmente un producto legacy sin campos requeridos", async () => {
  const db = testEnv.authenticatedContext(UID).firestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "productos", "PR-LEGACY-INCOMPLETO"), {
      stock: 1,
    });
  });

  await assert.rejects(
    setDoc(
      doc(db, "productos", "PR-LEGACY-INCOMPLETO"),
      {
        stock: 0,
        stockSucursal: [{ sucursal: "SC-A0001", stock: 0 }],
      },
      { merge: true },
    ),
  );
});

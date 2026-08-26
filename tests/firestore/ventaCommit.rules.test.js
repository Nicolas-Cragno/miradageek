import assert from "node:assert/strict";
import fs from "node:fs";
import process from "node:process";
import test, { after, before, beforeEach } from "node:test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

const PROJECT_ID = "demo-geek-look";
const UID = "qgN6KgzqAwNRPKXTsTtI4QyVrPY2";
const USUARIO_ID = "US-A0002";

let testEnv;

const acceso = {
  usuarioId: USUARIO_ID,
  tipo: "04",
  estado: true,
};

const contadorVentas = {
  id: "ventas",
  serie: "A",
  ultimo: 31,
};

const contadorDetalleVentas = {
  id: "detalleVentas",
  serie: "A",
  ultimo: 77,
};

const producto = {
  tipo: "FGR",
  descripcion: 'Spawn Figures - S09 - 7" Scale Assortment WIN OF REDEPTION',
  fecha: Timestamp.fromMillis(1784834770952),
  stock: 2,
  marca: "McFarlane Toys",
  precio: 94900,
  costo: 56000,
};

const canalVenta = {
  nombre: "Subasta",
  ventas: 0,
  totalPrecios: 0,
  id: "CV-A0005",
  estado: true,
  totalGanancia: 0,
  totalCostos: 0,
};

const canalGeneral = {
  nombre: "Ventas generales",
  id: "CV-A0000",
  estado: true,
  meses: {
    "2026-07": {
      ventas: 4,
      totalCostos: 250000,
      totalPrecios: 776828,
    },
    "2026-08": {
      ventas: 25,
      totalCostos: 1662614.5,
      totalPrecios: 3226422,
    },
  },
};

const canalInactivo = {
  ...canalVenta,
  id: "CV-A0006",
  nombre: "Canal inactivo",
  estado: false,
};

const datosVenta = () => ({
  sucursal: "SC-A0001",
  cliente: "CL-A0000",
  canal: "CV-A0005",
  monto: 73000,
  parcial: 73000,
  descuento: 0,
  moneda: "ARS",
  valorDivisa: 1,
  estado: "PENDIENTE",
  detalle: "",
  estadisticas: {
    version: 1,
    contabilizable: true,
    canal: "CV-A0005",
    ventas: 0,
    totalCostos: 0,
    totalPrecios: 0,
    meses: {},
  },
  usuario: USUARIO_ID,
  modificaciones: [],
  valorDolar: 1535,
  ediciones: [],
  detalleEstado: [{
    fecha: Timestamp.fromMillis(1787758862414),
    usuario: USUARIO_ID,
    estadoAnterior: null,
    estadoNuevo: "PENDIENTE",
    detalle: "Operación creada pendiente",
  }],
  fecha: serverTimestamp(),
});

const datosDetalleVenta = () => ({
  idProducto: "PR-A00000156",
  descripcion: producto.descripcion,
  cantidad: 1,
  precio: 73000,
  moneda: "ARS",
  cantidadCumplida: 0,
  activo: true,
  costo: 56000,
  monedaCosto: "ARS",
  valorDivisaCosto: 1,
  costoEnPesos: 56000,
  cumplimientos: [],
  venta: "VT-A00000032",
  ediciones: [],
  fecha: serverTimestamp(),
});

const actualizacionProducto = () => ({
  reservado: 1,
  precio: 73000,
  monedaPrecio: "ARS",
  ediciones: [{
    fecha: Timestamp.fromMillis(1787758862414),
    usuario: USUARIO_ID,
    campo: "precio",
    valorAnterior: 94900,
    valorNuevo: 73000,
  }],
});

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "accesosUsuarios", UID), acceso),
      setDoc(doc(db, "contadores", "ventas"), contadorVentas),
      setDoc(doc(db, "contadores", "detalleVentas"), contadorDetalleVentas),
      setDoc(doc(db, "productos", "PR-A00000156"), producto),
      setDoc(doc(db, "canalesVentas", "CV-A0005"), canalVenta),
      setDoc(doc(db, "canalesVentas", "CV-A0006"), canalInactivo),
      setDoc(doc(db, "canalesVentas", "CV-A0000"), canalGeneral),
    ]);
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test("reproduce el commit real completo de una venta", async () => {
  const db = testEnv.authenticatedContext(UID, {
    email: "usuario@test.local",
    email_verified: true,
  }).firestore();

  let errorCommit = null;
  try {
    await runTransaction(db, async (transaction) => {
      const contadorVentasRef = doc(db, "contadores", "ventas");
      const contadorDetalleRef = doc(db, "contadores", "detalleVentas");
      const productoRef = doc(db, "productos", "PR-A00000156");
      const canalGeneralRef = doc(db, "canalesVentas", "CV-A0000");
      const canalVentaRef = doc(db, "canalesVentas", "CV-A0005");

      await transaction.get(contadorVentasRef);
      await transaction.get(contadorDetalleRef);
      await transaction.get(productoRef);
      await transaction.get(canalGeneralRef);
      await transaction.get(canalVentaRef);

      transaction.update(contadorVentasRef, { serie: "A", ultimo: 32 });
      transaction.set(
        doc(db, "ventas", "VT-A00000032"),
        datosVenta(),
      );
      transaction.update(contadorDetalleRef, { serie: "A", ultimo: 78 });
      transaction.set(
        doc(db, "detalleVentas", "DV-A00000078"),
        datosDetalleVenta(),
      );
      transaction.update(productoRef, actualizacionProducto());
    });
  } catch (error) {
    errorCommit = error;
  }

  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const coverageResponse = await fetch(
    `http://${host}/emulator/v1/projects/${PROJECT_ID}:ruleCoverage`,
  );
  const coverage = coverageResponse.ok ? await coverageResponse.json() : null;
  const coverageErrors = Array.isArray(coverage?.report)
    ? coverage.report.filter((entry) => (entry.errorCount ?? 0) > 0)
    : [];

  console.error("[EMULATOR COMMIT RESULT]", JSON.stringify({
    allowed: errorCommit === null,
    error: errorCommit
      ? {
          code: errorCommit.code ?? null,
          message: errorCommit.message ?? null,
          name: errorCommit.name ?? null,
        }
      : null,
    coverageStatus: coverageResponse.status,
  }, null, 2));
  console.error(
    "[EMULATOR RULE COVERAGE ERRORS]",
    JSON.stringify(coverageErrors, null, 2),
  );

  assert.equal(errorCommit, null);
});

const contextoAutenticado = () => testEnv.authenticatedContext(UID, {
  email: "usuario@test.local",
  email_verified: true,
}).firestore();

test("aísla UPDATE contadores/ventas", async () => {
  const db = contextoAutenticado();
  await assert.doesNotReject(runTransaction(db, async (transaction) => {
    const referencia = doc(db, "contadores", "ventas");
    await transaction.get(referencia);
    transaction.update(referencia, { serie: "A", ultimo: 32 });
  }));
});

test("aísla CREATE ventas con lecturas de canales", async () => {
  const db = contextoAutenticado();
  await assert.doesNotReject(runTransaction(db, async (transaction) => {
    await transaction.get(doc(db, "canalesVentas", "CV-A0000"));
    await transaction.get(doc(db, "canalesVentas", "CV-A0005"));
    transaction.set(doc(db, "ventas", "VT-A00000032"), datosVenta());
  }));
});

test("aísla CREATE ventas sin lecturas que generen verify", async () => {
  const db = contextoAutenticado();
  await assert.doesNotReject(setDoc(
    doc(db, "ventas", "VT-A00000032"),
    datosVenta(),
  ));
});

test("aísla UPDATE contadores/detalleVentas", async () => {
  const db = contextoAutenticado();
  await assert.doesNotReject(runTransaction(db, async (transaction) => {
    const referencia = doc(db, "contadores", "detalleVentas");
    await transaction.get(referencia);
    transaction.update(referencia, { serie: "A", ultimo: 78 });
  }));
});

test("aísla CREATE detalleVentas", async () => {
  const db = contextoAutenticado();
  await assert.doesNotReject(setDoc(
    doc(db, "detalleVentas", "DV-A00000078"),
    datosDetalleVenta(),
  ));
});

test("aísla UPDATE productos", async () => {
  const db = contextoAutenticado();
  await assert.doesNotReject(runTransaction(db, async (transaction) => {
    const referencia = doc(db, "productos", "PR-A00000156");
    await transaction.get(referencia);
    transaction.update(referencia, actualizacionProducto());
  }));
});

const ventaModificada = (cambios = {}) => ({
  ...datosVenta(),
  ...cambios,
});

const crearVenta = (id, datos) => setDoc(
  doc(contextoAutenticado(), "ventas", id),
  datos,
);

test("rechaza usuario distinto al usuarioId autenticado", async () => {
  await assert.rejects(crearVenta(
    "VT-NEG-USUARIO",
    ventaModificada({ usuario: "US-A0003" }),
  ));
});

test("rechaza usuario con formato inválido", async () => {
  await assert.rejects(crearVenta(
    "VT-NEG-FORMATO",
    ventaModificada({ usuario: "usuario-invalido" }),
  ));
});

test("rechaza modificaciones iniciales no vacías", async () => {
  await assert.rejects(crearVenta(
    "VT-NEG-MODIFICACIONES",
    ventaModificada({ modificaciones: [{}] }),
  ));
});

test("rechaza ediciones iniciales no vacías", async () => {
  await assert.rejects(crearVenta(
    "VT-NEG-EDICIONES",
    ventaModificada({ ediciones: [{}] }),
  ));
});

test("rechaza detalleEstado con tamaño distinto de uno", async () => {
  await assert.rejects(crearVenta(
    "VT-NEG-DETALLE-TAMANIO",
    ventaModificada({ detalleEstado: [] }),
  ));
});

test("rechaza detalleEstado con usuario incorrecto", async () => {
  const venta = datosVenta();
  venta.detalleEstado[0].usuario = "US-A0003";
  await assert.rejects(crearVenta("VT-NEG-DETALLE-USUARIO", venta));
});

test("rechaza valorDolar menor o igual a cero", async () => {
  await assert.rejects(crearVenta(
    "VT-NEG-DOLAR",
    ventaModificada({ valorDolar: 0 }),
  ));
});

test("rechaza CV-A0000 como canal seleccionado", async () => {
  const venta = datosVenta();
  venta.canal = "CV-A0000";
  venta.estadisticas.canal = "CV-A0000";
  await assert.rejects(crearVenta("VT-NEG-CANAL-GENERAL", venta));
});

test("rechaza un canal inexistente", async () => {
  const venta = datosVenta();
  venta.canal = "CV-A9999";
  venta.estadisticas.canal = "CV-A9999";
  await assert.rejects(crearVenta("VT-NEG-CANAL-INEXISTENTE", venta));
});

test("rechaza un canal inactivo", async () => {
  const venta = datosVenta();
  venta.canal = "CV-A0006";
  venta.estadisticas.canal = "CV-A0006";
  await assert.rejects(crearVenta("VT-NEG-CANAL-INACTIVO", venta));
});

import assert from "node:assert/strict";
import fs from "node:fs";
import process from "node:process";
import test, { after, before, beforeEach } from "node:test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

const PROJECT_ID = "demo-geek-look";
const UID = "qgN6KgzqAwNRPKXTsTtI4QyVrPY2";
const USUARIO_ID = "US-A0002";
const UID_GESTOR = "gestorRol02Uid";
const USUARIO_GESTOR_ID = "US-A0004";
const UID_ADMINISTRADOR = "administradorRol03Uid";
const USUARIO_ADMINISTRADOR_ID = "US-A0003";
const UID_CLIENTE = "clienteRol01Uid";
const UID_GESTOR_INACTIVO = "gestorRol02InactivoUid";

let testEnv;

const acceso = {
  usuarioId: USUARIO_ID,
  tipo: "04",
  estado: true,
};

const accesoGestor = {
  usuarioId: USUARIO_GESTOR_ID,
  tipo: "02",
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
  pendiente: 0,
  reservado: 0,
};

const accesoAdministrador = {
  usuarioId: USUARIO_ADMINISTRADOR_ID,
  tipo: "03",
  estado: true,
};

const productoModerno = {
  ...producto,
  monedaCosto: "ARS",
  monedaPrecio: "ARS",
};

const productoLegacyPesos = {
  ...producto,
  monedaCosto: "pesos",
  monedaPrecio: "pesos",
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

const canalOtros = {
  ...canalVenta,
  id: "CV-A0004",
  nombre: "Otros",
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
  ediciones: [
    {
      fecha: Timestamp.fromMillis(1787758862414),
      usuario: USUARIO_ID,
      campo: "precio",
      valorAnterior: 94900,
      valorNuevo: 73000,
    },
    {
      fecha: Timestamp.fromMillis(1787758862414),
      usuario: USUARIO_ID,
      campo: "monedaPrecio",
      valorAnterior: null,
      valorNuevo: "ARS",
    },
  ],
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
      setDoc(doc(db, "accesosUsuarios", UID_GESTOR), accesoGestor),
      setDoc(
        doc(db, "accesosUsuarios", UID_ADMINISTRADOR),
        accesoAdministrador,
      ),
      setDoc(doc(db, "accesosUsuarios", UID_CLIENTE), {
        usuarioId: "US-A0006",
        tipo: "01",
        estado: true,
        entidadTipo: "cliente",
        entidadId: "CL-A0001",
      }),
      setDoc(doc(db, "accesosUsuarios", UID_GESTOR_INACTIVO), {
        usuarioId: "US-A0007",
        tipo: "02",
        estado: false,
      }),
      setDoc(doc(db, "contadores", "ventas"), contadorVentas),
      setDoc(doc(db, "contadores", "detalleVentas"), contadorDetalleVentas),
      setDoc(doc(db, "productos", "PR-A00000156"), producto),
      setDoc(doc(db, "productos", "PR-MODERNO"), productoModerno),
      setDoc(doc(db, "productos", "PR-LEGACY-SIN-MONEDAS"), producto),
      setDoc(doc(db, "productos", "PR-LEGACY-PESOS"), productoLegacyPesos),
      setDoc(doc(db, "productos", "PR-LEGACY-COSTO-NULL"), {
        ...producto,
        costo: null,
      }),
      setDoc(doc(db, "productos", "PR-LEGACY-DOS"), {
        ...producto,
        descripcion: "Segundo producto legacy",
        precio: 49000,
        costo: 31000,
      }),
      setDoc(doc(db, "productos", "PR-LEGACY-METADATA"), {
        ...productoLegacyPesos,
        reservado: 4,
        metadataHistorica: { origen: "importacion", version: 1 },
        ediciones: [{ formatoAnterior: 1 }, { formatoAnterior: 2 }],
      }),
      setDoc(doc(db, "canalesVentas", "CV-A0005"), canalVenta),
      setDoc(doc(db, "canalesVentas", "CV-A0004"), canalOtros),
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

const contextoGestor = () => testEnv.authenticatedContext(UID_GESTOR, {
  email: "gestor@test.local",
  email_verified: true,
}).firestore();

const contextoAdministrador = () => testEnv.authenticatedContext(
  UID_ADMINISTRADOR,
  {
    email: "administrador@test.local",
    email_verified: true,
  },
).firestore();

const contextoCliente = () => testEnv.authenticatedContext(UID_CLIENTE, {
  email: "cliente@test.local",
  email_verified: true,
}).firestore();

const contextoGestorInactivo = () => testEnv.authenticatedContext(
  UID_GESTOR_INACTIVO,
  {
    email: "gestor-inactivo@test.local",
    email_verified: true,
  },
).firestore();

const commitVentaPendienteRol02 = async (productosVenta, canal = "CV-A0004") => {
  const db = contextoGestor();
  await runTransaction(db, async (transaction) => {
    const contadorVentasRef = doc(db, "contadores", "ventas");
    const contadorDetalleRef = doc(db, "contadores", "detalleVentas");
    const snapshots = [];
    await transaction.get(contadorVentasRef);
    await transaction.get(contadorDetalleRef);
    await transaction.get(doc(db, "canalesVentas", "CV-A0000"));
    await transaction.get(doc(db, "canalesVentas", canal));
    for (const item of productosVenta) {
      const referencia = doc(db, "productos", item.id);
      const snapshot = await transaction.get(referencia);
      snapshots.push({ referencia, datos: snapshot.data(), precio: item.precio });
    }

    const monto = productosVenta.reduce((total, item) => total + item.precio, 0);
    transaction.update(contadorVentasRef, { serie: "A", ultimo: 32 });
    transaction.set(doc(db, "ventas", "VT-ROL02-COMPLETA"), ventaModificada({
      canal,
      monto,
      parcial: monto,
      usuario: USUARIO_GESTOR_ID,
      estadisticas: { ...datosVenta().estadisticas, canal },
      detalleEstado: [{
        ...datosVenta().detalleEstado[0],
        usuario: USUARIO_GESTOR_ID,
      }],
    }));
    transaction.update(contadorDetalleRef, {
      serie: "A",
      ultimo: 77 + productosVenta.length,
    });

    snapshots.forEach(({ referencia, datos, precio }, index) => {
      transaction.set(
        doc(db, "detalleVentas", `DV-ROL02-${index + 1}`),
        {
          ...datosDetalleVenta(),
          idProducto: productosVenta[index].id,
          descripcion: datos.descripcion,
          precio,
          costo: datos.costo,
          monedaCosto: datos.monedaCosto === "USD" ? "USD" : "ARS",
          valorDivisaCosto: 1,
          costoEnPesos: datos.costo,
          venta: "VT-ROL02-COMPLETA",
        },
      );
      const ediciones = [];
      if (datos.precio !== precio) {
        ediciones.push({
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "precio",
          valorAnterior: datos.precio,
          valorNuevo: precio,
        });
      }
      if (datos.monedaPrecio !== "ARS") {
        ediciones.push({
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "monedaPrecio",
          valorAnterior: datos.monedaPrecio ?? null,
          valorNuevo: "ARS",
        });
      }
      transaction.update(referencia, {
        reservado: 1,
        precio,
        monedaPrecio: "ARS",
        ...(ediciones.length ? { ediciones } : {}),
      });
    });
  });
};

test("rol 02 crea venta PENDIENTE con producto moderno", async () => {
  await assert.doesNotReject(commitVentaPendienteRol02([
    { id: "PR-MODERNO", precio: productoModerno.precio },
  ]));
});

test("rol 02 crea venta PENDIENTE con producto legacy sin monedas", async () => {
  await assert.doesNotReject(commitVentaPendienteRol02([
    { id: "PR-LEGACY-SIN-MONEDAS", precio: 73000 },
  ]));
});

test("rol 02 crea venta PENDIENTE con monedas legacy pesos", async () => {
  await assert.doesNotReject(commitVentaPendienteRol02([
    { id: "PR-LEGACY-PESOS", precio: 73000 },
  ]));
});

test("rol 02 crea venta de dos productos legacy usando CV-A0004", async () => {
  await assert.doesNotReject(commitVentaPendienteRol02([
    { id: "PR-LEGACY-SIN-MONEDAS", precio: 73000 },
    { id: "PR-LEGACY-DOS", precio: 49000 },
  ]));
});

test("rol 02 lista sólo canales comerciales activos", async () => {
  const snapshot = await getDocs(query(
    collection(contextoGestor(), "canalesVentas"),
    where("estado", "==", true),
    where("id", "!=", "CV-A0000"),
  ));
  assert.deepEqual(
    snapshot.docs.map((documento) => documento.id).sort(),
    ["CV-A0004", "CV-A0005"],
  );
});

test("rol 02 no puede listar canales sin las restricciones comerciales", async () => {
  await assert.rejects(getDocs(collection(contextoGestor(), "canalesVentas")));
});

test("rol 02 conserva GET puntual del canal general", async () => {
  await assert.doesNotReject(getDoc(
    doc(contextoGestor(), "canalesVentas", "CV-A0000"),
  ));
});

test("rol 04 conserva el listado completo de canales", async () => {
  const snapshot = await getDocs(collection(contextoAutenticado(), "canalesVentas"));
  assert.equal(snapshot.size, 4);
});

test("rol 02 puede crear ventas con Otros y otro canal activo", async () => {
  await assert.doesNotReject(setDoc(
    doc(contextoGestor(), "ventas", "VT-ROL02-OTROS"),
    ventaModificada({
      canal: "CV-A0004",
      usuario: USUARIO_GESTOR_ID,
      estadisticas: {
        ...datosVenta().estadisticas,
        canal: "CV-A0004",
      },
      detalleEstado: [{
        ...datosVenta().detalleEstado[0],
        usuario: USUARIO_GESTOR_ID,
      }],
    }),
  ));
  await assert.doesNotReject(setDoc(
    doc(contextoGestor(), "ventas", "VT-ROL02-CANAL"),
    ventaModificada({
      usuario: USUARIO_GESTOR_ID,
      detalleEstado: [{
        ...datosVenta().detalleEstado[0],
        usuario: USUARIO_GESTOR_ID,
      }],
    }),
  ));
});

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

const actualizarLegacyComoGestor = (id, cambios) => setDoc(
  doc(contextoGestor(), "productos", id),
  cambios,
  { merge: true },
);

test("rol 02 permite transición legacy de compra pendiente", async () => {
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    {
      pendiente: 2,
      costo: 60000,
      monedaCosto: "ARS",
      ediciones: [
        {
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "costo",
          valorAnterior: 56000,
          valorNuevo: 60000,
        },
        {
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "monedaCosto",
          valorAnterior: null,
          valorNuevo: "ARS",
        },
      ],
    },
  ));
});

test("compra conserva costo null legacy cuando sólo cambia pendiente", async () => {
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-COSTO-NULL",
    { pendiente: 2 },
  ));
});

test("roles 03 y 04 usan la compatibilidad legacy de operaciones", async () => {
  await assert.doesNotReject(setDoc(
    doc(contextoAdministrador(), "productos", "PR-LEGACY-SIN-MONEDAS"),
    { reservado: 1 },
    { merge: true },
  ));
  await assert.doesNotReject(setDoc(
    doc(contextoAutenticado(), "productos", "PR-LEGACY-DOS"),
    { pendiente: 1 },
    { merge: true },
  ));
});

test("rol 02 permite transición PARCIAL legacy de venta y compra", async () => {
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    {
      reservado: 0,
      stock: 1,
      stockSucursal: [{ sucursal: "SC-A0001", stock: 1 }],
    },
  ));
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-DOS",
    {
      pendiente: 0,
      stock: 3,
      stockSucursal: [{ sucursal: "SC-A0001", stock: 3 }],
    },
  ));
});

test("rol 02 permite alta COMPLETADA sobre legacy de venta y compra", async () => {
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    {
      reservado: 0,
      precio: 73000,
      monedaPrecio: "ARS",
      stock: 1,
      stockSucursal: [{ sucursal: "SC-A0001", stock: 1 }],
      ediciones: [
        {
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "precio",
          valorAnterior: 94900,
          valorNuevo: 73000,
        },
        {
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "monedaPrecio",
          valorAnterior: null,
          valorNuevo: "ARS",
        },
      ],
    },
  ));
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-DOS",
    {
      pendiente: 0,
      costo: 32000,
      monedaCosto: "ARS",
      stock: 3,
      stockSucursal: [{ sucursal: "SC-A0001", stock: 3 }],
      ediciones: [
        {
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "costo",
          valorAnterior: 31000,
          valorNuevo: 32000,
        },
        {
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "monedaCosto",
          valorAnterior: null,
          valorNuevo: "ARS",
        },
      ],
    },
  ));
});

test("rol 02 permite liberar obligación legacy al anular", async () => {
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    { reservado: 0 },
  ));
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-DOS",
    { pendiente: 0 },
  ));
});

test("rol 02 permite exactamente reservado 5 a 3 con monedas pesos", async () => {
  const productoId = "PR-LEGACY-RESERVADO-EXACTO";
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "productos", productoId), {
      ...productoLegacyPesos,
      reservado: 5,
    });
  });

  await assert.doesNotReject(actualizarLegacyComoGestor(
    productoId,
    { reservado: 3 },
  ));
  const actualizado = await getDoc(doc(contextoGestor(), "productos", productoId));
  assert.equal(actualizado.data().reservado, 3);
});

test("rol 02 anula integralmente una venta legacy y libera reservado", async () => {
  const productoId = "PR-LEGACY-ANULACION";
  const ventaId = "VT-LEGACY-ANULACION";
  const detalleId = "DV-LEGACY-ANULACION";
  const fechaCreacion = Timestamp.fromMillis(1787758862414);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "productos", productoId), {
        ...producto,
        descripcion: "Producto legacy para anulación",
        reservado: 5,
      }),
      setDoc(doc(db, "ventas", ventaId), ventaModificada({
        usuario: "US-A0005",
        detalleEstado: [{
          fecha: fechaCreacion,
          usuario: "US-A0005",
          estadoAnterior: null,
          estadoNuevo: "PENDIENTE",
          detalle: "Operación creada pendiente",
        }],
        fecha: fechaCreacion,
        canal: "CV-A0004",
        estadisticas: {
          ...datosVenta().estadisticas,
          canal: "CV-A0004",
        },
      })),
      setDoc(doc(db, "detalleVentas", detalleId), {
        ...datosDetalleVenta(),
        idProducto: productoId,
        descripcion: "Producto legacy para anulación",
        cantidad: 2,
        cantidadCumplida: 0,
        venta: ventaId,
        fecha: fechaCreacion,
      }),
    ]);
  });

  const db = contextoGestor();
  const fechaAnulacion = Timestamp.fromMillis(1787758914204);
  await assert.doesNotReject(runTransaction(db, async (transaction) => {
    const productoRef = doc(db, "productos", productoId);
    const ventaRef = doc(db, "ventas", ventaId);
    await transaction.get(ventaRef);
    await transaction.get(doc(db, "detalleVentas", detalleId));
    await transaction.get(productoRef);
    await transaction.get(doc(db, "canalesVentas", "CV-A0000"));
    await transaction.get(doc(db, "canalesVentas", "CV-A0004"));

    transaction.update(productoRef, { reservado: 3 });
    transaction.update(ventaRef, {
      estado: "ANULADA",
      estadisticas: {
        ...datosVenta().estadisticas,
        canal: "CV-A0004",
      },
      detalleEstado: [
        {
          fecha: fechaCreacion,
          usuario: "US-A0005",
          estadoAnterior: null,
          estadoNuevo: "PENDIENTE",
          detalle: "Operación creada pendiente",
        },
        {
          fecha: fechaAnulacion,
          usuario: USUARIO_GESTOR_ID,
          estadoAnterior: "PENDIENTE",
          estadoNuevo: "ANULADA",
          detalle: "Era una prueba",
        },
      ],
    });
  }));

  const [productoActualizado, ventaActualizada] = await Promise.all([
    getDoc(doc(db, "productos", productoId)),
    getDoc(doc(db, "ventas", ventaId)),
  ]);
  assert.equal(productoActualizado.data().reservado, 3);
  assert.equal(ventaActualizada.data().estado, "ANULADA");
});

test("rechaza edición manual mezclada con una transición legacy", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    { reservado: 1, descripcion: "Edición manual arbitraria" },
  ));
});

test("rechaza campo desconocido en transición legacy", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    { reservado: 1, campoDesconocido: true },
  ));
});

test("rechaza modificar id en transición legacy", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    { reservado: 1, id: "PR-OTRO" },
  ));
});

for (const [nombre, cambios] of [
  ["reservado null", { reservado: null }],
  ["reservado negativo", { reservado: -1 }],
  ["pendiente string", { pendiente: "2" }],
  ["stock string", { stock: "1" }],
  ["precio negativo", { reservado: 1, precio: -1 }],
  ["costo negativo", { pendiente: 1, costo: -1 }],
  ["monedaPrecio legacy nueva", { reservado: 1, monedaPrecio: "pesos" }],
  ["monedaCosto legacy nueva", { pendiente: 1, monedaCosto: "pesos" }],
]) {
  test(`rechaza ${nombre} en transición de producto legacy`, async () => {
    await assert.rejects(actualizarLegacyComoGestor(
      "PR-LEGACY-SIN-MONEDAS",
      cambios,
    ));
  });
}

test("rechaza cambiar precio legacy sin auditoría coherente", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    { reservado: 1, precio: 73000, monedaPrecio: "ARS" },
  ));
});

test("rechaza auditoría de operación atribuida a otro usuario", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    {
      reservado: 1,
      precio: 73000,
      ediciones: [{
        fecha: Timestamp.fromMillis(1787758862414),
        usuario: USUARIO_ID,
        campo: "precio",
        valorAnterior: 94900,
        valorNuevo: 73000,
      }],
    },
  ));
});

test("CREATE de producto moderno conserva validación estricta", async () => {
  await assert.doesNotReject(setDoc(
    doc(contextoGestor(), "productos", "PR-CREATE-MODERNO"),
    productoModerno,
  ));
});

test("CREATE de producto legacy sin monedas es rechazado", async () => {
  await assert.rejects(setDoc(
    doc(contextoGestor(), "productos", "PR-CREATE-LEGACY"),
    producto,
  ));
});

test("rol 02 permite reservado 4 a 3 conservando metadata y ediciones legacy", async () => {
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-METADATA",
    { reservado: 3 },
  ));
  const snapshot = await getDoc(doc(
    contextoGestor(),
    "productos",
    "PR-LEGACY-METADATA",
  ));
  assert.deepEqual(snapshot.data().metadataHistorica, {
    origen: "importacion",
    version: 1,
  });
  assert.deepEqual(snapshot.data().ediciones, [
    { formatoAnterior: 1 },
    { formatoAnterior: 2 },
  ]);
});

test("rechaza agregar metadata desconocida durante una actualización operativa", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    { reservado: 1, metadataNueva: true },
  ));
});

test("rechaza modificar metadata histórica durante una actualización operativa", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-METADATA",
    {
      reservado: 3,
      metadataHistorica: { origen: "manual", version: 2 },
    },
  ));
});

test("rechaza eliminar metadata histórica durante una actualización operativa", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-METADATA",
    { reservado: 3, metadataHistorica: deleteField() },
  ));
});

test("rechaza mezclar campos comerciales de venta y compra", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-SIN-MONEDAS",
    { reservado: 1, pendiente: 1 },
  ));
});

test("precio puede cambiar con append exacto sobre ediciones legacy", async () => {
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-METADATA",
    {
      reservado: 3,
      precio: 73000,
      ediciones: [
        { formatoAnterior: 1 },
        { formatoAnterior: 2 },
        {
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "precio",
          valorAnterior: 94900,
          valorNuevo: 73000,
        },
      ],
    },
  ));
});

test("rechaza reemplazar o reordenar el historial legacy de ediciones", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-METADATA",
    {
      reservado: 3,
      precio: 73000,
      ediciones: [
        { formatoAnterior: 2 },
        { formatoAnterior: 1 },
        {
          fecha: Timestamp.fromMillis(1787758862414),
          usuario: USUARIO_GESTOR_ID,
          campo: "precio",
          valorAnterior: 94900,
          valorNuevo: 73000,
        },
      ],
    },
  ));
});

test("rechaza modificar ediciones si precio costo y monedas no cambian", async () => {
  await assert.rejects(actualizarLegacyComoGestor(
    "PR-LEGACY-METADATA",
    {
      reservado: 3,
      ediciones: [
        { formatoAnterior: 1 },
        { formatoAnterior: 2 },
        { formatoAnterior: 3 },
      ],
    },
  ));
});

test("movimiento de stock preserva documento legacy desconocido", async () => {
  await assert.doesNotReject(actualizarLegacyComoGestor(
    "PR-LEGACY-METADATA",
    {
      stock: 3,
      stockSucursal: [{ sucursal: "SC-A0001", stock: 3 }],
    },
  ));
});

test("rol 01 no puede usar compatibilidad operativa de productos", async () => {
  await assert.rejects(setDoc(
    doc(contextoCliente(), "productos", "PR-LEGACY-METADATA"),
    { reservado: 3 },
    { merge: true },
  ));
});

test("rol 02 inactivo no puede usar compatibilidad operativa de productos", async () => {
  await assert.rejects(setDoc(
    doc(contextoGestorInactivo(), "productos", "PR-LEGACY-METADATA"),
    { reservado: 3 },
    { merge: true },
  ));
});

test("usuario no autenticado no puede actualizar productos", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assert.rejects(setDoc(
    doc(db, "productos", "PR-LEGACY-METADATA"),
    { reservado: 3 },
    { merge: true },
  ));
});

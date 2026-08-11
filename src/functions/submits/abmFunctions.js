import { db } from "../../firebase/firebaseConfig";
import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

const detailInternalFields = new Set([
  "id",
  "label",
  "labelProducto",
  "stockActual",
  "diferencia",
]);

function cleanDetail(item) {
  return Object.fromEntries(
    Object.entries(item).filter(([key]) => !detailInternalFields.has(key)),
  );
}
function codesFromCounter(collectionName, counterData, count) {
  const config = configuracionIds[collectionName];
  if (!config) throw new Error(`No existe configuración para ${collectionName}.`);

  let { serie = "A", ultimo = 0 } = counterData;
  const codes = [];

  for (let index = 0; index < count; index += 1) {
    ultimo += 1;
    if (ultimo > config.maximo) {
      serie = siguienteSerie(serie);
      ultimo = 1;
    }
    codes.push(
      config.prefijo + serie + String(ultimo).padStart(config.longitud, "0"),
    );
  }

  return { codes, nextCounter: { serie, ultimo } };
}

export async function guardarOperacion({
  collection: collectionName,
  data,
  idElemento = null,
  detailCollection = null,
  detailRef = null,
  detalleNuevo = [],
  detalleOriginal = [],
}) {
  return runTransaction(db, async (transaction) => {
    const mainCounterRef = idElemento
      ? null
      : doc(db, "contadores", collectionName);
    const detailCounterRef = detailCollection
      ? doc(db, "contadores", detailCollection)
      : null;

    const mainCounterSnap = mainCounterRef
      ? await transaction.get(mainCounterRef)
      : null;
    const detailCounterSnap = detailCounterRef
      ? await transaction.get(detailCounterRef)
      : null;

    if (mainCounterRef && !mainCounterSnap.exists()) {
      throw new Error(`No existe el contador ${collectionName}.`);
    }
    if (detailCounterRef && !detailCounterSnap.exists()) {
      throw new Error(`No existe el contador ${detailCollection}.`);
    }

    const productIds = [
      ...new Set(
        [...detalleNuevo, ...detalleOriginal]
          .map((item) => item.idProducto)
          .filter(Boolean),
      ),
    ];
    const productSnapshots = new Map();

    for (const productId of productIds) {
      const productRef = doc(db, "productos", productId);
      const snapshot = await transaction.get(productRef);
      if (!snapshot.exists()) {
        throw new Error(`No existe el producto ${productId}.`);
      }
      productSnapshots.set(productId, { ref: productRef, data: snapshot.data() });
    }

    let operationId = idElemento;
    if (mainCounterRef) {
      const allocation = codesFromCounter(
        collectionName,
        mainCounterSnap.data(),
        1,
      );
      [operationId] = allocation.codes;
      transaction.update(mainCounterRef, allocation.nextCounter);
    }

    const operationRef = doc(db, collectionName, operationId);
    if (idElemento) transaction.update(operationRef, data);
    else transaction.set(operationRef, data);

    for (const previousDetail of detalleOriginal) {
      if (previousDetail.id && detailCollection) {
        transaction.delete(doc(db, detailCollection, previousDetail.id));
      }
    }

    if (detailCounterRef) {
      const allocation = codesFromCounter(
        detailCollection,
        detailCounterSnap.data(),
        detalleNuevo.length,
      );
      transaction.update(detailCounterRef, allocation.nextCounter);

      detalleNuevo.forEach((item, index) => {
        transaction.set(doc(db, detailCollection, allocation.codes[index]), {
          ...cleanDetail(item),
          fecha: serverTimestamp(),
          [detailRef]: operationId,
        });
      });
    }

    for (const productId of productIds) {
      const product = productSnapshots.get(productId);
      const nextItem = detalleNuevo.find(
        (item) => String(item.idProducto) === String(productId),
      );
      const previousItem = detalleOriginal.find(
        (item) => String(item.idProducto) === String(productId),
      );
      const currentStock = Number(product.data.stock) || 0;
      let update;

      if (detailRef === "stock") {
        if (!nextItem) continue;
        const nextStock = Number(nextItem.stockNuevo);
        if (!Number.isFinite(nextStock) || nextStock < 0) {
          throw new Error("El nuevo stock debe ser un número válido.");
        }
        update = { stock: nextStock };
      } else {
        const difference =
          Number(nextItem?.cantidad ?? 0) - Number(previousItem?.cantidad ?? 0);
        const nextStock =
          detailRef === "venta"
            ? currentStock - difference
            : currentStock + difference;

        if (!Number.isFinite(nextStock) || nextStock < 0) {
          throw new Error("No hay stock suficiente para completar la venta.");
        }

        update = { stock: nextStock };
        if (nextItem) {
          update[detailRef === "venta" ? "precio" : "costo"] = Number(
            nextItem.precio,
          );
        }
      }

      transaction.update(product.ref, update);
    }

    return operationId;
  });
}

// generacion de codigos
const configuracionIds = {
  clientes: {
    // CL-A0001
    prefijo: "CL-",
    longitud: 4,
    maximo: 9999,
  },

  proveedores: {
    // PV-A0001
    prefijo: "PV-",
    longitud: 4,
    maximo: 9999,
  },

  productos: {
    // PR-A00000001
    prefijo: "PR-",
    longitud: 8,
    maximo: 99999999,
  },

  compras: {
    // CP-A00000001
    prefijo: "CP-",
    longitud: 8,
    maximo: 99999999,
  },

  detalleCompras: {
    // DC-A00000001
    prefijo: "DC-",
    longitud: 8,
    maximo: 99999999,
  },

  ventas: {
    // VT-A00000001
    prefijo: "VT-",
    longitud: 8,
    maximo: 99999999,
  },

  detalleVentas: {
    // DV-A00000001
    prefijo: "DV-",
    longitud: 8,
    maximo: 99999999,
  },

  stock: {
    // ST-A00000001
    prefijo: "ST-",
    longitud: 8,
    maximo: 99999999,
  },
  detalleStock: {
    // DS-A00000001
    prefijo: "DS-",
    longitud: 8,
    maximo: 99999999,
  },
};

function siguienteSerie(serie) {
  // para esta parte del codigo → CL->>"A"<<<0001
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const arr = serie.split("");

  let i = arr.length - 1;

  while (i >= 0) {
    const indice = letras.indexOf(arr[i]);

    if (indice < 25) {
      arr[i] = letras[indice + 1];
      return arr.join("");
    }

    arr[i] = "A";
    i--;
  }

  arr.unshift("A");

  return arr.join("");
}

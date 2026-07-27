import { db } from "../../firebase/firebaseConfig";
import {
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export async function agregar(coleccion, data) {
  try {
    const codigo = await generarCodigo(coleccion);

    if (!codigo) {
      throw new Error("[Error] No se pudo generar el código.");
    }

    const ref = doc(db, coleccion, codigo);
    await setDoc(ref, data);

    return codigo;
  } catch (error) {
    console.error("[Firestore] Error agregando:", error);
    throw error;
  }
}
export async function modificar(coleccion, id, data) {
  try {
    const ref = doc(db, coleccion, id);

    await updateDoc(ref, data);

    return true;
  } catch (error) {
    console.error("[Firestore] Error modificando:", error);
    throw error;
  }
}
export async function eliminar(coleccion, id) {
  try {
    const ref = doc(db, coleccion, id);

    await deleteDoc(ref);

    return true;
  } catch (error) {
    console.error("[Firestore] Error eliminando:", error);
    throw error;
  }
}

// operacionales (compras y ventas)
export async function eliminarDetalle(coleccion, campoRef, idRef) {
  try {
    const q = query(collection(db, coleccion), where(campoRef, "==", idRef));

    const snapshot = await getDocs(q);

    const detalles = snapshot.docs.map((d) =>
      deleteDoc(doc(db, coleccion, d.id)),
    );

    await Promise.all(detalles);

    return true;
  } catch (error) {
    console.error("[Error] Eliminando detalle:", error);
    throw error;
  }
}
export async function actualizarProducto(
  idProducto,
  campoRef,
  cantidad,
  cantidadOriginal,
  valor,
) {
  try {
    const q = query(collection(db, "productos"), where("id", "==", idProducto));

    const snapshot = await getDocs(q);

    const producto = snapshot.docs[0];

    const productoRef = doc(db, "productos", producto.id);

    await runTransaction(db, async (ts) => {
      const pdSnap = await ts.get(productoRef);

      const pd = pdSnap.data();

      const stockActual = Number(pd.stock) || 0;

      let nuevoStock = stockActual;

      let data = {};

      const diferencia = calcularDiferencia(cantidadOriginal, cantidad);

      switch (campoRef) {
        case "compra":
          nuevoStock += Number(diferencia);
          data = {
            stock: nuevoStock,
            costo: Number(valor),
          };
          break;
        case "venta":
          nuevoStock -= Number(diferencia);

          data = {
            stock: nuevoStock,
            precio: Number(valor),
          };
          break;
        default:
          data = {
            stock: nuevoStock,
          };
      }

      ts.update(productoRef, data);
    });

    return true;
  } catch (error) {
    console.error("[Error] Al actualizar producto:", error);
    throw error;
  }
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

async function generarCodigo(coleccion) {
  const config = configuracionIds[coleccion];

  if (!config) return null;

  return runTransaction(db, async (transaction) => {
    const contadorRef = doc(db, "contadores", coleccion);

    const contadorSnap = await transaction.get(contadorRef);

    if (!contadorSnap.exists()) {
      throw new Error(`[Error] No existe el contador ${coleccion}`);
    }

    let { serie = "A", ultimo = 0 } = contadorSnap.data();

    let siguiente = ultimo + 1;

    if (siguiente > config.maximo) {
      serie = siguienteSerie(serie);
      siguiente = 1;
    }

    // para evitar duplicados se actualizan primero los contadores
    transaction.update(contadorRef, {
      serie,
      ultimo: siguiente,
    });

    return (
      config.prefijo + serie + String(siguiente).padStart(config.longitud, "0")
    );
  });
}

const calcularDiferencia = (original, nuevo) => {
  return Number(nuevo) - Number(original);
};

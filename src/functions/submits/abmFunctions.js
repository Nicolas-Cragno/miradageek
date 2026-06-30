import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  setDoc,
  doc,
  updateDoc,
  runTransaction,
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
};



function siguienteSerie(serie) {
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
      config.prefijo +
      serie +
      String(siguiente).padStart(config.longitud, "0")
    );
  });
}
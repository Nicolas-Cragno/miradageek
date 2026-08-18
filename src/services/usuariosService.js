import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const siguienteCodigoUsuario = (contador) => {
  let serie = contador.serie || "A";
  let ultimo = Number(contador.ultimo || 0) + 1;

  if (ultimo > 9999) {
    serie = String.fromCharCode(serie.charCodeAt(0) + 1);
    ultimo = 1;
  }

  return {
    id: `US-${serie}${String(ultimo).padStart(4, "0")}`,
    contador: { serie, ultimo },
  };
};

const datosRelacion = (datos) =>
  datos.tipo === "01"
    ? {
        entidadTipo: datos.entidadTipo,
        entidadId: datos.entidadId,
      }
    : {
        entidadTipo: "",
        entidadId: "",
      };

export async function guardarUsuarioAdministrado(datos, usuarioOriginal = null) {
  return runTransaction(db, async (transaction) => {
    const esAlta = !usuarioOriginal;
    const uid = esAlta ? datos.uid.trim() : usuarioOriginal.uid;

    if (!uid) throw new Error("El UID de Firebase Authentication es obligatorio.");

    const accesoRef = doc(db, "accesosUsuarios", uid);
    const accesoSnapshot = await transaction.get(accesoRef);
    let usuarioId = usuarioOriginal?.id;
    let contadorRef = null;
    let contadorActualizado = null;

    if (esAlta) {
      if (accesoSnapshot.exists()) {
        throw new Error("Ya existe un acceso asociado a ese UID.");
      }

      contadorRef = doc(db, "contadores", "usuarios");
      const contadorSnapshot = await transaction.get(contadorRef);
      if (!contadorSnapshot.exists()) {
        throw new Error("No existe el contador de usuarios.");
      }

      const asignacion = siguienteCodigoUsuario(contadorSnapshot.data());
      usuarioId = asignacion.id;
      contadorActualizado = asignacion.contador;
    } else if (!accesoSnapshot.exists()) {
      throw new Error("El usuario no tiene un documento de acceso asociado.");
    }

    const relacion = datosRelacion(datos);
    const usuarioRef = doc(db, "usuarios", usuarioId);
    const datosUsuario = {
      nombre: datos.nombre.trim(),
      mail: datos.mail.trim(),
      uid,
      tipo: datos.tipo,
      estado: datos.estado,
      ...relacion,
    };
    const datosAcceso = {
      usuarioId,
      tipo: datos.tipo,
      estado: datos.estado,
      ...relacion,
    };

    if (esAlta) {
      transaction.set(usuarioRef, {
        id: usuarioId,
        ...datosUsuario,
        fecha: serverTimestamp(),
      });
      transaction.set(accesoRef, datosAcceso);
      transaction.update(contadorRef, contadorActualizado);
    } else {
      transaction.update(usuarioRef, datosUsuario);
      transaction.update(accesoRef, datosAcceso);
    }

    return usuarioId;
  });
}

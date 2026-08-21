import { doc, runTransaction } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase/firebaseConfig";
import { ROLES, TIPOS_ENTIDAD_USUARIO } from "../auth/permisos";

const mensajesAltaUsuario = {
  "functions/unauthenticated": "Iniciá sesión nuevamente para crear usuarios.",
  "functions/permission-denied": "No tenés permisos para crear ese tipo de usuario.",
  "functions/invalid-argument": "Revisá los datos ingresados.",
  "functions/already-exists": "Ya existe una cuenta registrada con ese correo.",
  "functions/failed-precondition":
    "No se pudo completar el alta de forma consistente. Contactá a un desarrollador.",
};

export async function crearUsuarioAdministrado(datos) {
  const crearUsuario = httpsCallable(functions, "crearUsuario");
  const relacion = datosRelacion(datos);
  try {
    const resultado = await crearUsuario({
      nombre: datos.nombre.trim(),
      mail: datos.mail.trim(),
      password: datos.password,
      tipo: datos.tipo,
      estado: datos.estado,
      ...relacion,
    });
    return resultado.data.usuarioId;
  } catch (error) {
    throw new Error(
      mensajesAltaUsuario[error?.code] ||
        error?.message ||
        "No se pudo crear el usuario.",
      { cause: error },
    );
  }
}

const datosRelacion = (datos) =>
  datos.tipo === ROLES.USUARIO
    ? validarRelacionUsuario(datos)
    : { entidadTipo: null, entidadId: null };

function validarRelacionUsuario(datos) {
  if (
    !TIPOS_ENTIDAD_USUARIO.includes(datos.entidadTipo) ||
    typeof datos.entidadId !== "string" ||
    !datos.entidadId.trim()
  ) {
    throw new Error("Seleccioná un cliente o proveedor relacionado.");
  }
  return {
    entidadTipo: datos.entidadTipo,
    entidadId: datos.entidadId.trim(),
  };
}

export async function guardarUsuarioAdministrado(datos, usuarioOriginal = null) {
  if (!usuarioOriginal) {
    throw new Error("Las altas de usuarios deben realizarse mediante el servidor.");
  }
  return runTransaction(db, async (transaction) => {
    const uid = usuarioOriginal.uid;
    const accesoRef = doc(db, "accesosUsuarios", uid);
    const accesoSnapshot = await transaction.get(accesoRef);
    if (!accesoSnapshot.exists()) {
      throw new Error("El usuario no tiene un documento de acceso asociado.");
    }

    const relacion = datosRelacion(datos);
    const usuarioRef = doc(db, "usuarios", usuarioOriginal.id);
    const datosUsuario = {
      nombre: datos.nombre.trim(),
      mail: datos.mail.trim(),
      uid,
      tipo: datos.tipo,
      estado: datos.estado,
      ...relacion,
    };
    const datosAcceso = {
      usuarioId: usuarioOriginal.id,
      tipo: datos.tipo,
      estado: datos.estado,
      ...relacion,
    };

    transaction.update(usuarioRef, datosUsuario);
    transaction.update(accesoRef, datosAcceso);

    return usuarioOriginal.id;
  });
}

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const auth = getAuth();
const rolesAdministrables = {
  "03": ["01", "02", "03"],
  "04": ["01", "02", "03", "04"],
};
const entidadesUsuario = {
  cliente: "clientes",
  proveedor: "proveedores",
};
const camposPermitidos = [
  "nombre",
  "mail",
  "password",
  "tipo",
  "estado",
  "entidadTipo",
  "entidadId",
];

function siguienteSerie(serie) {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const caracteres = String(serie || "A").split("");
  let indice = caracteres.length - 1;

  while (indice >= 0) {
    const posicion = letras.indexOf(caracteres[indice]);
    if (posicion < 0) throw new HttpsError("failed-precondition", "Contador inválido.");
    if (posicion < letras.length - 1) {
      caracteres[indice] = letras[posicion + 1];
      return caracteres.join("");
    }
    caracteres[indice] = "A";
    indice -= 1;
  }

  return `A${caracteres.join("")}`;
}

function asignarUsuario(contador) {
  let serie = contador.serie || "A";
  let ultimo = Number(contador.ultimo || 0) + 1;
  if (!Number.isInteger(ultimo) || ultimo < 1) {
    throw new HttpsError("failed-precondition", "Contador de usuarios inválido.");
  }
  if (ultimo > 9999) {
    serie = siguienteSerie(serie);
    ultimo = 1;
  }
  return {
    usuarioId: `US-${serie}${String(ultimo).padStart(4, "0")}`,
    contador: { serie, ultimo },
  };
}

function validarEntrada(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Datos inválidos.");
  }
  if (Object.keys(data).some((campo) => !camposPermitidos.includes(campo))) {
    throw new HttpsError("invalid-argument", "La solicitud contiene campos no permitidos.");
  }

  const nombre = typeof data.nombre === "string" ? data.nombre.trim() : "";
  const mail = typeof data.mail === "string" ? data.mail.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const tipo = data.tipo;
  const estado = data.estado;

  if (!nombre || nombre.length > 160) {
    throw new HttpsError("invalid-argument", "El nombre no es válido.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || mail.length > 254) {
    throw new HttpsError("invalid-argument", "El correo no es válido.");
  }
  if (password.length < 8 || password.length > 128) {
    throw new HttpsError("invalid-argument", "La contraseña no cumple los requisitos.");
  }
  if (!rolesAdministrables["04"].includes(tipo) || typeof estado !== "boolean") {
    throw new HttpsError("invalid-argument", "El rol o estado no es válido.");
  }

  const entidadTipo = tipo === "01" ? data.entidadTipo : null;
  const entidadId = tipo === "01" && typeof data.entidadId === "string"
    ? data.entidadId.trim()
    : null;
  if (
    tipo === "01" &&
    (!Object.hasOwn(entidadesUsuario, entidadTipo) ||
      !entidadId ||
      entidadId.length > 80)
  ) {
    throw new HttpsError("invalid-argument", "La entidad relacionada no es válida.");
  }
  if (
    tipo !== "01" &&
    ((data.entidadTipo ?? null) !== null || (data.entidadId ?? null) !== null)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Los roles internos no pueden tener una entidad relacionada.",
    );
  }

  return { nombre, mail, password, tipo, estado, entidadTipo, entidadId };
}

exports.crearUsuario = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Autenticación obligatoria.");
  }

  const accesoSolicitante = await db
    .doc(`accesosUsuarios/${request.auth.uid}`)
    .get();
  const autorizacion = accesoSolicitante.exists ? accesoSolicitante.data() : null;
  const rolesPermitidos = autorizacion?.estado === true
    ? rolesAdministrables[autorizacion.tipo]
    : null;
  if (!rolesPermitidos) {
    throw new HttpsError("permission-denied", "No tenés permisos para crear usuarios.");
  }

  const datos = validarEntrada(request.data);
  if (!rolesPermitidos.includes(datos.tipo)) {
    throw new HttpsError("permission-denied", "No podés asignar ese rol.");
  }

  let usuarioAuth;
  try {
    usuarioAuth = await auth.createUser({
      email: datos.mail,
      password: datos.password,
      displayName: datos.nombre,
      disabled: !datos.estado,
    });
  } catch (error) {
    if (error?.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Ya existe una cuenta con ese correo.");
    }
    if (error?.code === "auth/invalid-email" || error?.code === "auth/invalid-password") {
      throw new HttpsError("invalid-argument", "El correo o la contraseña no son válidos.");
    }
    throw new HttpsError("internal", "No se pudo crear la credencial.");
  }

  try {
    const usuarioId = await db.runTransaction(async (transaction) => {
      const contadorRef = db.doc("contadores/usuarios");
      const contadorSnapshot = await transaction.get(contadorRef);
      if (!contadorSnapshot.exists) {
        throw new HttpsError("failed-precondition", "No existe el contador de usuarios.");
      }

      const asignacion = asignarUsuario(contadorSnapshot.data());
      const usuarioRef = db.doc(`usuarios/${asignacion.usuarioId}`);
      const usuarioSnapshot = await transaction.get(usuarioRef);
      if (usuarioSnapshot.exists) {
        throw new HttpsError("failed-precondition", "El próximo ID de usuario ya existe.");
      }

      const relacion = datos.tipo === "01"
        ? { entidadTipo: datos.entidadTipo, entidadId: datos.entidadId }
        : { entidadTipo: null, entidadId: null };
      if (datos.tipo === "01") {
        const coleccionEntidad = entidadesUsuario[datos.entidadTipo];
        const entidadSnapshot = await transaction.get(
          db.doc(`${coleccionEntidad}/${datos.entidadId}`),
        );
        if (!entidadSnapshot.exists) {
          throw new HttpsError("invalid-argument", "La entidad relacionada no existe.");
        }
      }

      transaction.create(usuarioRef, {
        id: asignacion.usuarioId,
        uid: usuarioAuth.uid,
        nombre: datos.nombre,
        mail: datos.mail,
        tipo: datos.tipo,
        estado: datos.estado,
        ...relacion,
        fecha: FieldValue.serverTimestamp(),
      });
      transaction.create(db.doc(`accesosUsuarios/${usuarioAuth.uid}`), {
        usuarioId: asignacion.usuarioId,
        tipo: datos.tipo,
        estado: datos.estado,
        ...relacion,
      });
      transaction.update(contadorRef, asignacion.contador);
      return asignacion.usuarioId;
    });

    return { usuarioId, uid: usuarioAuth.uid };
  } catch (error) {
    try {
      await auth.deleteUser(usuarioAuth.uid);
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "Falló la persistencia y no se pudo revertir la credencial creada.",
      );
    }
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "No se pudo completar el alta del usuario.");
  }
});

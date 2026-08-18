import { guardarOperacion } from "./abmFunctions";
import { serverTimestamp } from "firebase/firestore";

export async function submit({
  collection,
  formData,
  originalData = {},
  campos,
  idElemento = null,
  detailCollection = null,
  detailRef = null,
  usuario = "",
  sucursalesDisponibles = [],
  permitirNegativo = false,
}) {
  const data = {};

  campos
    .filter((c) => c.form)
    .forEach((c) => {
      if (c.use === "database") {
        const valor = campoFirestore(formData[c.key], c.dato);
        if (valor !== undefined) data[c.key] = valor;
      }
    });

  const campoDetalle = campos.find((c) => c.use === "detailDatabase");
  const idReturn = await guardarOperacion({
    collection,
    data: idElemento ? data : { ...data, fecha: serverTimestamp() },
    idElemento,
    detailCollection,
    detailRef,
    detalleNuevo: campoDetalle ? formData[campoDetalle.key] ?? [] : [],
    detalleOriginal: campoDetalle ? originalData[campoDetalle.key] ?? [] : [],
    usuario,
    sucursalesDisponibles,
    permitirNegativo,
  });

  return idReturn;
}

function campoFirestore(valor, tipo = "string") {
  if (valor === undefined) return undefined;
  if (valor === null || valor === "") {
    return valor;
  }

  switch (tipo.toLowerCase()) {
    case "string":
      return String(valor);

    case "number": {
      const numero = Number(valor);

      if (!Number.isFinite(numero)) {
        throw new Error(`"${valor}" no es un número válido.`);
      }

      return numero;
    }

    case "timestamp":
      return valor;

    default:
      return valor;
  }
}

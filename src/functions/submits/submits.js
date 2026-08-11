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
}) {
  const data = {};

  campos
    .filter((c) => c.form)
    .forEach((c) => {
      if (c.use === "database") {
        data[c.key] = campoFirestore(formData[c.key], c.dato);
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
  });

  return idReturn;
}

function campoFirestore(valor, tipo = "string") {
  if (valor === null || valor === undefined || valor === "") {
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
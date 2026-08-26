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
  usuario,
  valorDolar = null,
  sucursalesDisponibles = [],
  permitirNegativo = false,
  cotizacionCosto = null,
}) {
  const data = {};

  campos
    .filter((c) => c.form)
    .forEach((c) => {
      if (c.use === "database") {
        const valor = campoFirestore(formData[c.key], c);
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
    valorDolar,
    sucursalesDisponibles,
    permitirNegativo,
    cotizacionCosto,
  });

  return idReturn;
}

function campoFirestore(valor, campo = {}) {
  if (valor === undefined) return undefined;

  switch ((campo.dato || "string").toLowerCase()) {
    case "string":
      if (valor === null || valor === "") return valor;
      return String(valor);

    case "number": {
      if (valor === null || valor === "") return null;

      const numero = Number(valor);

      if (!Number.isFinite(numero)) {
        throw new Error(`"${valor}" no es un número válido.`);
      }

      if (campo.min !== undefined && numero < campo.min) {
        throw new Error(`"${campo.label || campo.key}" no puede ser menor que ${campo.min}.`);
      }

      if (campo.max !== undefined && numero > campo.max) {
        throw new Error(`"${campo.label || campo.key}" no puede ser mayor que ${campo.max}.`);
      }

      return numero;
    }

    case "timestamp":
      return valor;

    default:
      return valor;
  }
}

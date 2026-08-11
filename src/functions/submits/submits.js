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
        data[c.key] = formData[c.key];
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

import { agregar, modificar, eliminar, eliminarDetalle, actualizarProducto } from "./abmFunctions";
import { serverTimestamp } from "firebase/firestore";

export async function submit({
  collection,
  formData,
  campos,
  idElemento = null,
  onGuardar,
  onClose,
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

  let idReturn = idElemento;

  if (idElemento) {
    await modificar(collection, idElemento, data);
    if (detailCollection && detailRef) {
      console.log("elimnardetalle")
      await eliminarDetalle(detailCollection, detailRef, idReturn);
    }
  } else {
    idReturn = await agregar(collection, { ...data, fecha: serverTimestamp() });
  }

  // GUARDAR DETALLE
  if (detailCollection && detailRef) {
    const campoDetalle = campos.find(c => c.use === "detailDatabase");

    if (campoDetalle) {
      const detalle = campoDetalle
        ? formData[campoDetalle.key] ?? []
        : [];


      for (const item of detalle) {
        await agregar(detailCollection, {
          ...item,
          fecha: serverTimestamp(),
          [detailRef]: idReturn
        });

        await actualizarProducto(item.idProducto, detailRef, item.cantidad, item.precio)
      }
    }
  }

  onGuardar?.();
  onClose?.();

  return idReturn;
}


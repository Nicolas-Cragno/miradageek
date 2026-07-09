import {
  agregar,
  modificar,
  eliminar,
  eliminarDetalle,
  actualizarProducto,
} from "./abmFunctions";
import { serverTimestamp } from "firebase/firestore";

export async function submit({
  collection,
  formData,
  originalData = {},
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
  let diferenciaCantidad = 0; // para los casos de modificacion (si de 1 pasa a 3 deben actualizarse 2)

  if (idElemento) {
    await modificar(collection, idElemento, data);
    if (detailCollection && detailRef) {
      await eliminarDetalle(detailCollection, detailRef, idReturn);
    }
  } else {
    idReturn = await agregar(collection, { ...data, fecha: serverTimestamp() });
  }

  // GUARDAR DETALLE
  if (detailCollection && detailRef) {
    const campoDetalle = campos.find((c) => c.use === "detailDatabase");

    if (campoDetalle) {
      const detalleNuevo = formData[campoDetalle.key] ?? [];
      const detalleOriginal = originalData[campoDetalle.key] ?? [];

      // NUEVOS Y MODIFICADOS
      for (const item of detalleNuevo) {
        await agregar(detailCollection, {
          ...item,
          fecha: serverTimestamp(),
          [detailRef]: idReturn,
        });

        const original = detalleOriginal.find(
          (d) => String(d.idProducto) === String(item.idProducto),
        );

        const cantidadOriginal = original?.cantidad ?? 0;

        await actualizarProducto(
          item.idProducto,
          detailRef,
          item.cantidad,
          cantidadOriginal,
          item.precio,
        );
      }

      // ELIMINADOS
      for (const itemOriginal of detalleOriginal) {
        const existe = detalleNuevo.some(
          (d) => String(d.idProducto) === String(itemOriginal.idProducto),
        );
        console.log("[DEBUG item eliminado]", itemOriginal);

        if (!existe) {
          await actualizarProducto(
            itemOriginal.idProducto,
            detailRef,
            0,
            itemOriginal.cantidad,
            itemOriginal.precio,
          );
        }
      }
    }
  }

  onGuardar?.();
  onClose?.();

  return idReturn;
}

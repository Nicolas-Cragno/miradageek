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
      console.log("DETALLE QUE VIENE DEL FORM:", detalleNuevo);
      const detalleOriginal = originalData[campoDetalle.key] ?? [];

      // NUEVOS Y MODIFICADOS
      for (const item of detalleNuevo) {
        console.log("ITEM COMPLETO:", item);
        console.log("CLAVES:", Object.keys(item));
        await agregar(detailCollection, {
          ...item,
          fecha: serverTimestamp(),
          [detailRef]: idReturn,
        });

        const original = detalleOriginal.find(
          (d) => String(d.idProducto) === String(item.idProducto),
        );

        const cantidadOriginal = original?.cantidad ?? 0;
        console.log("ITEM STOCK:", item);
        console.log("DETALLE STOCK:", item);
        if (detailRef === "stock") {
          console.log("ITEM STOCK COMPLETO:", item);
          console.log("ITEM:", item);
          console.log("item.stockNuevo:", item.stockNuevo);
          console.log("item.stockActual:", item.stockActual);
          await actualizarProducto(
            item.idProducto,
            "stock",
            item.stockNuevo,
            item.stockActual,
          );
        } else {
          await actualizarProducto(
            item.idProducto,
            detailRef,
            item.cantidad,
            cantidadOriginal,
            item.precio,
          );
        }
      }

      // ELIMINADOS
      if (detailRef !== "stock") {
        for (const itemOriginal of detalleOriginal) {
          const existe = detalleNuevo.some(
            (d) => String(d.idProducto) === String(itemOriginal.idProducto),
          );

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
  }

  onGuardar?.();
  onClose?.();

  return idReturn;
}

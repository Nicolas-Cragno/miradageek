import { agregar, modificar } from "./abmFunctions";

export async function submit({
  collection,
  formData,
  campos,
  idElemento = null,
  onGuardar,
  onClose,
}) {
  const data = {};

  campos
    .filter((c) => c.form)
    .forEach((c) => {
      data[c.key] = formData[c.key];
    });

  if (idElemento) {
    await modificar(collection, idElemento, data);
  } else {
    await agregar(collection, data);
  }

  onGuardar?.();
  onClose?.();
}

export async function submitMultiple({
  mainCollection,
  detailCollection,
  mainData,
  detailData = [],
  onGuardar,
  onClose,
}) {
  try {
    const compraId = await agregar(mainCollection, mainData);

    await Promise.all(
      detailData.map((item) =>
        agregar(detailCollection, {
          ...item,
          compra: compraId, // FK
        })
      )
    );

    onGuardar?.();
    onClose?.();
  } catch (error) {
    console.error("[submitMultiple] Error:", error);
    throw error;
  }
}
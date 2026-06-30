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

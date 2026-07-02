import { agregar, modificar, eliminar } from "./abmFunctions";

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

  const idReturn = idElemento;

  if (idElemento) {
    await modificar(collection, idElemento, data);
  } else {
    idReturn = await agregar(collection, data);
  }

  onGuardar?.();
  onClose?.();

  return idReturn;
}

export async function submitMultiple({
  collection,
  previousData = [],
  formData = [],
  campos,
}) {
  const tareas = [];

  const previousMap = new Map(
    previousData.map((item) => [item.id, item])
  );

  formData.forEach((item) => {
    tareas.push(
      submit({
        collection,
        formData: item,
        campos,
        idElemento: item.id ?? null,
      })
    );

    previousMap.delete(item.id);
  });

  previousMap.forEach((item) => {
    tareas.push(eliminar(collection, item.id));
  });

  await Promise.all(tareas);
}
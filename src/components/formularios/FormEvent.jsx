import { useEffect, useState } from "react";

import Form from "./Form";
import DetalleForm from "./DetalleForm";

export default function FormEvent({
  detalleCampos = [],
  detalleInicial = [],
  onSave,
  item,
  ...props
}) {
  const [detalle, setDetalle] = useState([]);

  useEffect(() => {
    setDetalle(detalleInicial ?? []);
  }, [detalleInicial]);

  async function guardar(datosCabecera) {
    await onSave?.({
      cabecera: datosCabecera,
      detalle,
    });
  }

  return (
    <Form {...props} item={item} onSave={guardar}>
      <DetalleForm
        titulo="Detalle"
        campos={detalleCampos}
        value={detalle}
        onChange={setDetalle}
      />
    </Form>
  );
}

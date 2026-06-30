import { useEffect, useState } from "react";
import InputForm from "../inputs/InputForm";
import TextButton from "../buttons/TextButton";
import "./css/Form.css";

export default function DetalleForm({
  campos = [],
  value = [],
  onChange,
  titulo = "Detalle",
}) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(value ?? []);
  }, [value]);

  const camposForm = campos.filter((c) => c.form);

  function actualizarItems(nuevosItems) {
    setItems(nuevosItems);
    onChange?.(nuevosItems);
  }

  function agregarItem() {
    const nuevo = {};

    camposForm.forEach((campo) => {
      nuevo[campo.key] = campo.default ?? "";
    });

    actualizarItems([...items, nuevo]);
  }

  function modificarItem(index, key, value) {
    const nuevos = [...items];
    nuevos[index] = {
      ...nuevos[index],
      [key]: value,
    };

    actualizarItems(nuevos);
  }

  function eliminarItem(index) {
    actualizarItems(items.filter((_, i) => i !== index));
  }

  return (
    <div className="detalle-form">
      <h3>{titulo}</h3>

      {items.map((item, index) => (
        <div className="detalle-item" key={index}>
          <div className="form-grid">
            {camposForm.map((campo) => (
              <InputForm
                key={campo.key}
                campo={campo}
                value={item[campo.key]}
                onChange={(key, value) => modificarItem(index, key, value)}
              />
            ))}
          </div>

          <TextButton
            text="Eliminar"
            color="red"
            onClick={() => eliminarItem(index)}
          />
        </div>
      ))}

      <TextButton text="Agregar" color="green" onClick={agregarItem} />
    </div>
  );
}

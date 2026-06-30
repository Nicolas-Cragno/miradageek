import { useEffect, useState } from "react";
import "./css/Form.css";
import { submit } from "../../functions/submits/Submits";

export default function Form({
  open = false,
  item = null,
  campos = [],
  collection = "",
  title,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      const nuevo = {};

      campos
        .filter((c) => c.form)
        .forEach((c) => {
          nuevo[c.key] = c.default ?? "";
        });

      setFormData(nuevo);
    }
  }, [item, campos]);

  if (!open) return null;

  const camposForm = campos.filter((c) => c.form);

  function handleChange(key, value) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    await submit({
      collection,
      formData,
      campos,
      idElemento: item?.id ?? null,
      onGuardar: onSave,
      onClose,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title ?? (item ? "Editar registro" : "Nuevo registro")}</h2>

          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {camposForm.map((campo) => (
              <div className="form-group" key={campo.key}>
                <label>{campo.label}</label>

                <input
                  type={campo.input || "text"}
                  value={formData[campo.key] ?? ""}
                  onChange={(e) => handleChange(campo.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="form-buttons">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit" className="btn-primary">
              {item ? "Guardar cambios" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

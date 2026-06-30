import { useEffect, useState } from "react";
import "./css/Form.css";
import { submit, submitMultiple } from "../../functions/submits/Submits";
import InputForm from "../inputs/InputForm";
import Loading from "../../routes/Loading";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (item) {
      setFormData(item);
    } else {
      const init = {};
      campos
        .filter((c) => c.form)
        .forEach((c) => {
          init[c.key] = c.default ?? "";
        });

      setFormData(init);
    }
  }, [item, campos, open]);

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
    setSaving(true);

    try {
      const mainData = {};

      camposForm.forEach((c) => {
        mainData[c.key] = formData[c.key];
      });

      await submit({
        collection,
        formData: mainData,
        campos,
        idElemento: item?.id ?? null,
        onGuardar: onSave,
        onClose,
      });
    } finally {
      setSaving(false);
    }
  }

  if (saving) return <Loading />;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title ?? (item ? "Editar" : "Nuevo")}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {camposForm.map((campo) => (
              <div key={campo.key} className="form-group">
                <InputForm
                  campo={campo}
                  value={formData[campo.key]}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>

          <div className="form-buttons">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit">{item ? "Guardar" : "Crear"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

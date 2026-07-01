import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import "./css/Form.css";
import { submit } from "../../functions/submits/Submits";
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width:768px) and (hover:none) and (pointer:coarse)",
    );

    const update = () => setIsMobile(media.matches);

    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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
  console.log("Render Form antes del return", { open });
  if (!open) return null;
  console.log("Render Form despues del return", { open });
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
          <button type="button" className="modal-close" onClick={onClose}>
            {isMobile ? <FiArrowLeft /> : "✕"}
          </button>

          <h2>{title ?? (item ? "Editar" : "Nuevo")}</h2>

          {/* Espaciador para centrar el título */}
          <div className="modal-spacer" />
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
            {!isMobile && (
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
            )}

            <button type="submit" className="btn-primary">
              {item ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

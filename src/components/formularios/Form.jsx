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
  detailCollection = null,
  detailRef = null,
}) {
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
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
    // para las compras & ventas
    const campoDetalle = campos.find((c) => c.use === "detailDatabase");
    const campoMonto = campos.find((c) => c.key === "monto");

    if (!campoDetalle || !campoMonto) return;

    const items = formData[campoDetalle.key] ?? [];

    const total = items.reduce((acc, item) => {
      const cantidad = Number(item.cantidad) || 0;
      const precio = Number(item.precio) || 0;

      return acc + cantidad * precio;
    }, 0);

    if (formData.monto !== total) {
      setFormData((prev) => ({
        ...prev,
        monto: total,
      }));
    }
  }, [formData, campos]);

  useEffect(() => {
    if (!open) return;

    if (item) {
      setFormData(item);
      setOriginalData(item); // estado inicial del elemento
    } else {
      const init = {};

      campos
        .filter((c) => c.form)
        .forEach((c) => {
          if (c.input === "list") {
            init[c.key] = [];
          } else {
            init[c.key] = c.default ?? "";
          }
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
      let mainData = {};

      camposForm.forEach((c) => {
        mainData[c.key] = formData[c.key];
      });

      await submit({
        collection,
        formData: mainData,
        originalData: originalData,
        campos,
        idElemento: item?.id ?? null,
        onGuardar: onSave,
        onClose,
        detailCollection,
        detailRef,
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
              <div
                className={`form-group ${
                  campo.input === "list" || campo.input === "listStock"
                    ? "form-group-full"
                    : ""
                }`}
              >
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

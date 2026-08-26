import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import "./css/Form.css";
import { submit } from "../../functions/submits/submits";
import InputForm from "../inputs/InputForm";
import Loading from "../../routes/Loading";
import { showError, showSuccess } from "../../utils/alerts";
import { useAuth } from "../../auth/AuthContext";
import { obtenerVentaDolarOficial } from "../../services/dolarService";

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
  const { user } = useAuth();
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
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
          if (c.input === "list" || c.input === "listStock") {
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

    setSaveError("");

    const usuario = user?.id;
    if (typeof usuario !== "string" || !/^US-[A-Z][0-9]{4}$/.test(usuario)) {
      const message =
        "No pudimos identificar tu usuario interno. Cerrá sesión y volvé a ingresar.";
      setSaveError(message);
      await showError("No se pudo guardar", message);
      return;
    }

    setSaving(true);

    try {
      let mainData = {};
      let valorDolar = null;

      camposForm.forEach((c) => {
        mainData[c.key] = formData[c.key];
      });

      if (!item && ["compras", "ventas"].includes(collection)) {
        try {
          valorDolar = await obtenerVentaDolarOficial();
        } catch {
          throw new Error(
            "No se pudo obtener la cotización oficial del dólar. La operación no fue guardada.",
          );
        }
        if (!Number.isFinite(valorDolar) || valorDolar <= 0) {
          throw new Error(
            "La cotización oficial del dólar no es válida. La operación no fue guardada.",
          );
        }
        mainData.valorDivisa =
          formData.moneda === "USD" ? Number(formData.valorDivisa) : 1;
      }

      await submit({
        collection,
        formData: mainData,
        originalData: originalData,
        campos,
        idElemento: item?.id ?? null,
        detailCollection,
        detailRef,
        usuario,
        valorDolar,
        cotizacionCosto: valorDolar,
      });

      setSaving(false);

      await showSuccess(
        item ? "Cambios guardados" : "Registro creado",
        "La operación se completó correctamente.",
      );
      onSave?.();
      onClose?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar. Intentá nuevamente.";
      setSaveError(message);

      setSaving(false);
      await showError("No se pudo guardar", message);
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
          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
          <div className="form-grid">
            {camposForm.map((campo) => (
              <div
                key={campo.key}
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
                  detailRef={detailRef}
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

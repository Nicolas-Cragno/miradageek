import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import "./css/Form.css";
import { submit } from "../../functions/submits/submits";
import InputForm from "../inputs/InputForm";
import Loading from "../../routes/Loading";
import { showError, showSuccess } from "../../utils/alerts";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../context/DataContext";
import {
  obtenerValorDivisa,
  obtenerVentaDolarOficial,
} from "../../services/dolarService";

const cotizacionUsdValida = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 1;
};

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
  const data = useData();
  const { user } = useAuth();
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [cotizacionError, setCotizacionError] = useState("");

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
      const defaults = Object.fromEntries(
        campos
          .filter((campo) => campo.form && campo.default !== undefined)
          .map((campo) => [campo.key, campo.default]),
      );
      setFormData({ ...defaults, ...item });
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
  const campoDetalleForm = campos.find((campo) => campo.use === "detailDatabase");
  const detallesOriginales = campoDetalleForm
    ? originalData[campoDetalleForm.key] || []
    : [];
  const cotizacionHistoricaBloqueada =
    collection === "ventas" &&
    Boolean(item) &&
    (
      Number(originalData.estadisticas?.ventas || 0) > 0 ||
      detallesOriginales.some(
        (detalle) =>
          Number(detalle.cantidadCumplida || 0) > 0 ||
          (detalle.cumplimientos || []).length > 0,
      )
    );

  function handleChange(key, value) {
    if (key === "moneda" && ["compras", "ventas"].includes(collection)) {
      setSaveError("");

      if (value === "ARS") {
        setCotizacionError("");
        setFormData((prev) => ({
          ...prev,
          moneda: value,
          valorDivisa: 1,
        }));
        return;
      }

      if (value === "USD") {
        setCotizacionError("");
        setFormData((prev) => ({
          ...prev,
          moneda: value,
          valorDivisa: "",
        }));
        obtenerValorDivisa("USD")
          .then((cotizacion) => {
            if (!cotizacionUsdValida(cotizacion)) {
              throw new Error("La cotización obtenida no es válida.");
            }
            setFormData((prev) =>
              prev.moneda === "USD" && !cotizacionUsdValida(prev.valorDivisa)
                ? { ...prev, valorDivisa: cotizacion }
                : prev,
            );
          })
          .catch(() => {
            setCotizacionError(
              "No se pudo obtener la cotización oficial. Ingresala manualmente para continuar.",
            );
          });
        return;
      }
    }
    if (key === "valorDivisa" && cotizacionUsdValida(value)) {
      setCotizacionError("");
    }
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
      if (["compras", "ventas"].includes(collection)) {
        if (formData.moneda === "ARS" && Number(formData.valorDivisa) !== 1) {
          throw new Error("Las operaciones en ARS deben usar valor de divisa 1.");
        }
        if (formData.moneda === "USD" && !cotizacionUsdValida(formData.valorDivisa)) {
          throw new Error("Ingresá una cotización USD válida y distinta de 1.");
        }
      }

      let mainData = {};
      let valorDolar = null;

      camposForm.forEach((c) => {
        mainData[c.key] = formData[c.key];
      });

      if (["compras", "ventas"].includes(collection)) {
        if (formData.moneda === "ARS") {
          mainData.valorDivisa = 1;
        } else if (formData.moneda === "USD") {
          const valorDivisa = Number(formData.valorDivisa);
          if (!Number.isFinite(valorDivisa) || valorDivisa <= 1) {
            throw new Error(
              "Ingresá una cotización válida para guardar una operación en dólares.",
            );
          }
          mainData.valorDivisa = valorDivisa;
        }
      }

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
      }

      const campoDetalle = campos.find((campo) => campo.use === "detailDatabase");
      const detalles = campoDetalle ? formData[campoDetalle.key] ?? [] : [];
      const idsExistentes = new Set(
        (campoDetalle ? originalData[campoDetalle.key] ?? [] : [])
          .filter((detalle) => detalle.id)
          .map((detalle) => detalle.id),
      );
      const requiereCotizacionCosto = collection === "ventas" && detalles.some((detalle) => {
        if (detalle.id && idsExistentes.has(detalle.id)) return false;
        const producto = (data.productos || []).find(
          (actual) => String(actual.id) === String(detalle.idProducto),
        );
        return String(producto?.monedaCosto || "ARS").toUpperCase() === "USD";
      });
      let cotizacionCosto = null;
      if (requiereCotizacionCosto) {
        try {
          cotizacionCosto = await obtenerValorDivisa("USD");
        } catch {
          throw new Error(
            "No se pudo obtener una cotización válida para congelar el costo USD de los productos.",
          );
        }
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
        cotizacionCosto,
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
          {(saveError || cotizacionError) && (
            <p className="form-error" role="alert">
              {saveError || cotizacionError}
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
                  monedaOperacion={formData.moneda}
                  valorDivisa={formData.valorDivisa}
                  readOnly={
                    cotizacionHistoricaBloqueada &&
                    ["moneda", "valorDivisa"].includes(campo.key)
                  }
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

import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import "./css/Form.css";
import { submit } from "../../functions/submits/submits";
import InputForm from "../inputs/InputForm";
import Loading from "../../routes/Loading";
import {
  showConfirmation,
  showError,
  showSuccess,
} from "../../utils/alerts";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../context/DataContext";
import { calcularMontos, ESTADOS_OPERACION } from "../../functions/operaciones/modeloOperaciones";
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
  const { sucursales = [] } = useData();
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [cotizacionWarning, setCotizacionWarning] = useState("");
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

    const { parcial, monto } = calcularMontos(items, formData.descuento);

    if (formData.monto !== monto || formData.parcial !== parcial) {
      setFormData((prev) => ({
        ...prev,
        parcial,
        monto,
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

  useEffect(() => {
    if (!open || item || !["compras", "ventas"].includes(collection)) return;
    let activo = true;
    setCotizacionWarning("");
    obtenerVentaDolarOficial()
      .then((venta) => {
        if (activo) setFormData((previo) => ({ ...previo, valorDivisa: venta }));
      })
      .catch(() => {
        if (activo) {
          setCotizacionWarning(
            "No se pudo obtener el dólar oficial. Podés ingresar la cotización manualmente.",
          );
        }
      });
    return () => {
      activo = false;
    };
  }, [collection, item, open]);

  if (!open) return null;
  const camposForm = campos.filter((c) => c.form && (!item || !c.altaOnly));

  function handleChange(key, value) {
    setFormData((prev) => {
      if (key === "tipo" && collection === "stock" && prev.tipo !== value) {
        const campoDetalle = campos.find((campo) => campo.use === "detailDatabase");
        return {
          ...prev,
          tipo: value,
          ...(campoDetalle ? { [campoDetalle.key]: [] } : {}),
        };
      }
      if (key !== "moneda" || !["ARS", "USD"].includes(value)) {
        return { ...prev, [key]: value };
      }
      const campoDetalle = campos.find((campo) => campo.use === "detailDatabase");
      if (!campoDetalle || prev.moneda === value) return { ...prev, moneda: value };
      const cotizacion = Number(prev.valorDivisa);
      if (!Number.isFinite(cotizacion) || cotizacion <= 0) {
        return { ...prev, moneda: value };
      }
      const detalles = (prev[campoDetalle.key] || []).map((detalle) => ({
        ...detalle,
        precio:
          prev.moneda === "USD" && value === "ARS"
            ? Number(detalle.precio) * cotizacion
            : Number(detalle.precio) / cotizacion,
        moneda: value,
      }));
      return { ...prev, moneda: value, [campoDetalle.key]: detalles };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSaveError("");

    const campoDetalle = campos.find((campo) => campo.use === "detailDatabase");
    const detalles = campoDetalle ? formData[campoDetalle.key] ?? [] : [];
    if (["compras", "ventas"].includes(collection)) {
      const referencia = collection === "compras" ? "proveedor" : "cliente";
      const descuento = Number(formData.descuento ?? 0);
      if (!formData[referencia]) {
        await showError("Datos incompletos", `Seleccioná un ${referencia}.`);
        return;
      }
      if (!formData.sucursal) {
        await showError("Datos incompletos", "Seleccioná una sucursal.");
        return;
      }
      if (!detalles.length) {
        await showError(
          "Operación sin productos",
          "La operación debe contener al menos un producto.",
        );
        return;
      }
      if (!Number.isFinite(descuento) || descuento < 0 || descuento > 100) {
        await showError("Descuento inválido", "El descuento debe estar entre 0 y 100.");
        return;
      }
    }

    setSaving(true);

    const ejecutarGuardado = async (permitirNegativo = false) => {
      let mainData = {};

      camposForm.forEach((c) => {
        mainData[c.key] = formData[c.key];
      });

      return submit({
        collection,
        formData: mainData,
        originalData: originalData,
        campos,
        idElemento: item?.id ?? null,
        detailCollection,
        detailRef,
        usuario: user?.id || "",
        sucursalesDisponibles: sucursales.map((sucursal) => sucursal.id),
        permitirNegativo,
      });
    };

    try {
      if (
        !item &&
        formData.estado === ESTADOS_OPERACION.COMPLETADA &&
        !(await showConfirmation(
          "Movimiento físico inmediato",
          `${collection === "compras" ? "Ingresarán" : "Saldrán"} las unidades informadas en la sucursal seleccionada.`,
          "Confirmar operación",
        ))
      ) {
        setSaving(false);
        return;
      }

      try {
        await ejecutarGuardado(false);
      } catch (error) {
        if (error?.code !== "stock-negativo") throw error;
        const confirmado = await showConfirmation(
          "Stock o disponibilidad negativa",
          error.message,
          "Continuar igualmente",
        );
        if (!confirmado) {
          setSaving(false);
          return;
        }
        await ejecutarGuardado(true);
      }

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
          {cotizacionWarning && <p className="form-warning">{cotizacionWarning}</p>}
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
                  tipoMovimiento={formData.tipo}
                  sucursalMovimiento={formData.sucursal}
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

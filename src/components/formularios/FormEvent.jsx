import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import "./css/Form.css";

import { submit, submitMultiple } from "../../functions/submits/Submits";

import InputForm from "../inputs/InputForm";
import TablaDetalle from "../tablas/TablaDetalle";

import Loading from "../../routes/Loading";
import useMobile from "../../functions/ResponsiveFunctions";

export default function FormEvent({
  open = false,

  // Evento principal
  item = null,

  // Detalle
  detail = [],

  campos = [],
  camposDetail = [],

  collection = "",
  collectionDetail = "",
  relationField = "",

  title,

  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({});
  const [detailData, setDetailData] = useState([]);
  const [saving, setSaving] = useState(false);

  const isMobile = useMobile();

  useEffect(() => {
    if (!open) return;

    // Evento principal
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

    // Detalle
    setDetailData(detail ?? []);
  }, [open, item, detail, campos]);

  const camposForm = useMemo(() => campos.filter((c) => c.form), [campos]);

  if (!open) return null;

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
      const principalData = {};

      camposForm.forEach((c) => {
        principalData[c.key] = formData[c.key];
      });

      // Guarda el encabezado
      const idEvent = await submit({
        collection,
        formData: principalData,
        campos,
        idElemento: item?.id ?? null,
      });

      // Relaciona todos los detalles con el evento
      const detailSubmit = detailData.map((item) => ({
        ...item,
        [relationField]: idEvent,
      }));

      await submitMultiple({
        collection: collectionDetail,
        previousData: detail,
        formData: detailSubmit,
        campos: camposDetail,
      });

      onSave?.();
      onClose?.();
    } catch (error) {
      console.error(error);
      console.log("[Error] al intentar guardar");
    } finally {
      setSaving(false);
    }
  }

  if (saving) return <Loading />;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-form modal-form-event"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <button type="button" className="modal-close" onClick={onClose}>
            {isMobile ? <FiArrowLeft /> : "✕"}
          </button>

          <h2>{title ?? (item ? "Editar" : "Nuevo")}</h2>

          <div className="modal-spacer" />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Encabezado */}

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

          {/* Detalle */}

          <TablaDetalle
            data={detailData}
            setData={setDetailData}
            campos={camposDetail}
          />

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

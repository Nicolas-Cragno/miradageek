import { useState, useEffect } from "react";

import Tabla from "../components/tablas/Tabla";
import Ficha from "../components/fichas/Ficha";
import Form from "../components/formularios/Form";
import { FiArrowLeft } from "react-icons/fi";
import "./css/Sections.css";
import LogoButton from "../components/buttons/LogoButton";
import TextButton from "../components/buttons/TextButton";

import camposStock from "../data/campos/camposStock.json";

export default function Section({
  data = [],
  campos = [],
  title = "",
  collection = "",
  FormComponent = Form,
  detailCollection = null,
  detailRef = null,
  buttonStock = false,
}) {
  const [selected, setSelected] = useState(null);
  const [formType, setFormType] = useState("default");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [view, setView] = useState("list");

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 768px) and (hover:none) and (pointer:coarse)",
    );
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function nuevo() {
    setFormType("default");
    setEditingItem(null);
    setFormOpen(true);

    if (isMobile) setView("form");
  }

  function ajusteStock() {
    setFormType("stock");
    setEditingItem(null);
    setFormOpen(true);

    if (isMobile) setView("form");
  }

  function editar() {
    if (!selected) return;
    setFormType("default");
    setEditingItem(selected);
    setFormOpen(true);
  }

  const seleccionar = (item) => {
    setSelected(item);

    if (isMobile) {
      setView("detail");
    }
  };

  async function guardar(item) {
    console.log(item);

    setFormOpen(false);
  }

  const volver = () => {
    setView("list");
  };

  if (!isMobile) {
    return (
      <>
        <div className="section-container">
          <div className="section-list">
            <div className="section-header">
              <h1>{title}</h1>
              <div className="section-header-buttons">
                {buttonStock && (
                  <TextButton text={"Ajuste stock"} onClick={ajusteStock} />
                )}
                <TextButton text={"+ Nuevo"} onClick={nuevo} />
              </div>
            </div>

            <Tabla data={data} campos={campos} onSelect={seleccionar} />
          </div>

          <div className="section-detail">
            <Ficha item={selected} campos={campos} onEdit={editar} />
          </div>
        </div>

        <FormComponent
          open={formOpen}
          item={editingItem}
          campos={formType === "stock" ? camposStock : campos}
          collection={formType === "stock" ? "stock" : collection}
          title={
            formType === "stock"
              ? "Ajuste de stock"
              : editingItem
                ? `Editar ${title}`
                : `Nuevo ${title}`
          }
          onClose={() => setFormOpen(false)}
          onSave={guardar}
          detailCollection={
            formType === "stock" ? "detalleStock" : detailCollection
          }
          detailRef={formType === "stock" ? "stock" : detailRef}
        />
      </>
    );
  } else {
    return (
      <>
        {view === "list" ? (
          <div className="section-list">
            <div className="section-header ">
              <h1>{title}</h1>
              <TextButton text="+ Nuevo" onClick={nuevo} />
            </div>

            <Tabla data={data} campos={campos} onSelect={seleccionar} />
          </div>
        ) : view === "form" ? (
          <FormComponent
            open={formOpen}
            item={editingItem}
            campos={formType === "stock" ? camposStock : campos}
            collection={formType === "stock" ? "stock" : collection}
            title={
              formType === "stock"
                ? "Ajuste de stock"
                : editingItem
                  ? `Editar ${title}`
                  : `Nuevo ${title}`
            }
            onClose={() => setFormOpen(false)}
            onSave={guardar}
            detailCollection={
              formType === "stock" ? "detalleStock" : detailCollection
            }
            detailRef={formType === "stock" ? "stock" : detailRef}
          />
        ) : (
          <>
            <div className="section-detail-mobile">
              <button type="button" className="modal-close" onClick={volver}>
                <FiArrowLeft />
              </button>

              <Ficha item={selected} campos={campos} onEdit={editar} />
            </div>
            <FormComponent
              open={formOpen}
              item={editingItem}
              campos={formType === "stock" ? camposStock : campos}
              collection={formType === "stock" ? "stock" : collection}
              title={
                formType === "stock"
                  ? "Ajuste de stock"
                  : editingItem
                    ? `Editar ${title}`
                    : `Nuevo ${title}`
              }
              onClose={() => setFormOpen(false)}
              onSave={guardar}
              detailCollection={
                formType === "stock" ? "detalleStock" : detailCollection
              }
              detailRef={formType === "stock" ? "stock" : detailRef}
            />
          </>
        )}
      </>
    );
  }
}

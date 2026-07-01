import { useState, useEffect } from "react";

import Tabla from "../components/tablas/Tabla";
import Ficha from "../components/fichas/Ficha";
import Form from "../components/formularios/Form";

import "./css/Sections.css";
import LogoButton from "../components/buttons/LogoButton";
import TextButton from "../components/buttons/TextButton";

export default function Section({
  data = [],
  campos = [],
  title = "",
  collection = "",
  FormComponent = Form,
  detailCollection = null,
  camposDetalle = [],
}) {
  const [selected, setSelected] = useState(null);
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
    setEditingItem(null);
    setFormOpen(true);
  }

  function editar() {
    if (!selected) return;

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
              <TextButton text={"+ Nuevo"} onClick={nuevo} />
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
          campos={campos}
          collection={collection}
          title={editingItem ? `Editar ${title}` : `Nuevo ${title}`}
          onClose={() => setFormOpen(false)}
          onSave={guardar}
          detailCollection={detailCollection}
          camposDetalle={camposDetalle}
          detalleKey={detailCollection}
        />
      </>
    );
  } else {
    return (
      <>
        {view === "list" ? (
          <div className="section-list">
            <div className="section-header">
              <h1>{title}</h1>
              <TextButton text="+ Nuevo" onClick={nuevo} />
            </div>

            <Tabla data={data} campos={campos} onSelect={seleccionar} />
          </div>
        ) : (
          <>
            <div className="section-detail-mobile">
              <TextButton text="← Volver" onClick={volver} />

              <Ficha item={selected} campos={campos} onEdit={editar} />
            </div>
            <FormComponent
              open={formOpen}
              item={editingItem}
              campos={campos}
              collection={collection}
              title={editingItem ? `Editar ${title}` : `Nuevo ${title}`}
              onClose={() => setFormOpen(false)}
              onSave={guardar}
              detailCollection={detailCollection}
              camposDetalle={camposDetalle}
              detalleKey={detailCollection}
            />
          </>
        )}
      </>
    );
  }
}

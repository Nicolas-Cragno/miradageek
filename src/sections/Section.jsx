import { useState, useEffect } from "react";

import Tabla from "../components/tablas/Tabla";
import Ficha from "../components/fichas/Ficha";
import Form from "../components/formularios/Form";
import { FiArrowLeft } from "react-icons/fi";
import "./css/Sections.css";
import TextButton from "../components/buttons/TextButton";

import camposStock from "../data/campos/camposStock.json";
import { useAuth } from "../auth/AuthContext";
import { puedeGestionarOperaciones } from "../auth/permisos";
import TransferenciaForm from "../components/formularios/TransferenciaForm";

export default function Section({
  data = [],
  campos = [],
  title = "",
  collection = "",
  FormComponent = Form,
  detailCollection = null,
  detailRef = null,
  buttonStock = false,
  renderActions = null,
  permitirAlta = true,
  mensajeAltaDeshabilitada = "Alta temporalmente deshabilitada",
}) {
  const { user } = useAuth();
  const puedeGestionar = puedeGestionarOperaciones(user);
  const [selected, setSelected] = useState(null);
  const [formType, setFormType] = useState("default");
  const [formOpen, setFormOpen] = useState(false);
  const [transferenciaOpen, setTransferenciaOpen] = useState(false);
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
    if (!permitirAlta) return;
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

  useEffect(() => {
    if (!selected) return;
    const actualizado = data.find((item) => item.id === selected.id);
    if (actualizado && actualizado !== selected) setSelected(actualizado);
  }, [data, selected]);

  function guardar() {
    setFormOpen(false);
    if (isMobile) setView("list");
  }

  function cerrarFormulario() {
    setFormOpen(false);
    if (isMobile) setView("list");
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
                {buttonStock && puedeGestionar && (
                  <>
                    <TextButton
                      text={"Transferir"}
                      onClick={() => setTransferenciaOpen(true)}
                    />
                    <TextButton text={"Ajuste stock"} onClick={ajusteStock} />
                  </>
                )}
                {puedeGestionar && permitirAlta && (
                  <TextButton
                    text={"Nuevo usuario"}
                    onClick={nuevo}
                    disabled={!permitirAlta}
                    title={!permitirAlta ? mensajeAltaDeshabilitada : undefined}
                  />
                )}
              </div>
            </div>

            <Tabla data={data} campos={campos} onSelect={seleccionar} />
          </div>

          <div className="section-detail">
            <Ficha
              item={selected}
              campos={campos}
              onEdit={puedeGestionar ? editar : null}
              actions={renderActions?.(selected)}
            />
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
          onClose={cerrarFormulario}
          onSave={guardar}
          detailCollection={
            formType === "stock" ? "detalleStock" : detailCollection
          }
          detailRef={formType === "stock" ? "stock" : detailRef}
        />
        {buttonStock && (
          <TransferenciaForm
            open={transferenciaOpen}
            onClose={() => setTransferenciaOpen(false)}
            onSave={guardar}
          />
        )}
      </>
    );
  } else {
    return (
      <>
        {view === "list" ? (
          <div className="section-list">
            <div className="section-header ">
              <h1>{title}</h1>
              {puedeGestionar && permitirAlta && (
                <TextButton
                  text={"Nuevo usuario"}
                  onClick={nuevo}
                  disabled={!permitirAlta}
                  title={!permitirAlta ? mensajeAltaDeshabilitada : undefined}
                />
              )}
              {buttonStock && puedeGestionar && (
                <TextButton
                  text="Transferir"
                  onClick={() => setTransferenciaOpen(true)}
                />
              )}
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
            onClose={cerrarFormulario}
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

              <Ficha
                item={selected}
                campos={campos}
                onEdit={puedeGestionar ? editar : null}
                actions={renderActions?.(selected)}
              />
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
              onClose={cerrarFormulario}
              onSave={guardar}
              detailCollection={
                formType === "stock" ? "detalleStock" : detailCollection
              }
              detailRef={formType === "stock" ? "stock" : detailRef}
            />
          </>
        )}
        {buttonStock && (
          <TransferenciaForm
            open={transferenciaOpen}
            onClose={() => setTransferenciaOpen(false)}
            onSave={guardar}
          />
        )}
      </>
    );
  }
}

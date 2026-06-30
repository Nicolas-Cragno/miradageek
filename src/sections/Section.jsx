import { useState } from "react";

import Tabla from "../components/tablas/Tabla";
import Ficha from "../components/fichas/Ficha";
import Form from "../components/formularios/Form";

import "./css/Sections.css";

export default function Section({
  data = [],
  campos = [],
  title = "",
  collection = "",
}) {
  const [selected, setSelected] = useState(null);

  const [formOpen, setFormOpen] = useState(false);

  const [editingItem, setEditingItem] = useState(null);

  function nuevo() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function editar() {
    if (!selected) return;

    setEditingItem(selected);
    setFormOpen(true);
  }

  async function guardar(item) {
    console.log(item);

    setFormOpen(false);
  }

  return (
    <>
      <div className="section-container">
        <div className="section-list">
          <div className="section-header">
            <h1>{title}</h1>

            <button onClick={nuevo}>+ Nuevo</button>
          </div>

          <Tabla data={data} campos={campos} onSelect={setSelected} />
        </div>

        <div className="section-detail">
          <Ficha item={selected} campos={campos} onEdit={editar} />
        </div>
      </div>

      <Form
        open={formOpen}
        item={editingItem}
        campos={campos}
        collection={collection}
        title={editingItem ? `Editar ${title}` : `Nuevo ${title}`}
        onClose={() => setFormOpen(false)}
        onSave={guardar}
      />
    </>
  );
}

import { useState } from "react";
import "./SideBar.css";

export default function SideBar() {
  const [open, setOpen] = useState(true);

  return (
    <div className={`sidebar ${open ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <h2 className="logo">GECKO</h2>

        <button className="toggle-btn" onClick={() => setOpen(!open)}>
          {open ? "⟨" : "⟩"}
        </button>
      </div>

      <nav className="sidebar-nav">
        <a href="#productos" className="nav-item">
          📦 {open && "Productos"}
        </a>

        <a href="#clientes" className="nav-item">
          👤 {open && "Clientes"}
        </a>

        <a href="#proveedores" className="nav-item">
          🚚 {open && "Proveedores"}
        </a>
      </nav>
    </div>
  );
}

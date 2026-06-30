import { NavLink } from "react-router-dom";
import "./css/Sidebar.css";
import Logo from "../../assets/logos/Logo.png";
import { GiBoxUnpacking as BoxLogo } from "react-icons/gi";
import { IoPerson as CustomerLogo } from "react-icons/io5";
import { LuBaggageClaim as ProviderLogo } from "react-icons/lu";

export default function Sidebar({ open, setOpen }) {
  return (
    <div className={`sidebar ${open ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <NavLink to="/">
          <img src={Logo} alt="" className="logo" />
        </NavLink>

        <button className="toggle-btn" onClick={() => setOpen(!open)}>
          {open ? "⟨" : "⟩"}
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/productos"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <BoxLogo className="nav-icon" />
          <span className={`nav-text ${!open ? "hidden" : ""}`}>Productos</span>
        </NavLink>

        <NavLink to="/clientes" className="nav-item">
          <CustomerLogo className="nav-logo" />{" "}
          <span className={`nav-text ${!open ? "hidden" : ""}`}>Clientes</span>
        </NavLink>

        <NavLink to="/proveedores" className="nav-item">
          <ProviderLogo className="nav-logo" />{" "}
          <span className={`nav-text ${!open ? "hidden" : ""}`}>
            Proveedores
          </span>
        </NavLink>
        <hr />
        <NavLink to="/compras" className="nav-item">
          <ProviderLogo className="nav-logo" />{" "}
          <span className={`nav-text ${!open ? "hidden" : ""}`}>Compars</span>
        </NavLink>
      </nav>
    </div>
  );
}

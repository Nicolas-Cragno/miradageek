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
        <img src={Logo} alt="" className="logo" />

        <button className="toggle-btn" onClick={() => setOpen(!open)}>
          {open ? "⟨" : "⟩"}
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/productos" className="nav-item">
          <BoxLogo className="nav-logo" />{" "}
          <span className={`nav-text`}>Productos</span>
        </NavLink>

        <NavLink to="/clientes" className="nav-item">
          <CustomerLogo className="nav-logo" />{" "}
          <span className={`nav-text`}>Clientes</span>
        </NavLink>

        <NavLink to="/proveedores" className="nav-item">
          <ProviderLogo className="nav-logo" />{" "}
          <span className={`nav-text`}>Proveedores</span>
        </NavLink>
      </nav>
    </div>
  );
}

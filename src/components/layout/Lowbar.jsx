import { NavLink } from "react-router-dom";
import "./css/Lowbar.css";
import Logo from "../../assets/logos/Logo.png";
import { GiBoxUnpacking as BoxLogo } from "react-icons/gi";
import { IoPerson as CustomerLogo } from "react-icons/io5";
import { LuBaggageClaim as ProviderLogo } from "react-icons/lu";

export default function Lowbar() {
  return (
    <div className={`lowbar`}>
      <nav className="lowbar-nav-left">
        <NavLink
          to="/productos"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <BoxLogo className="nav-icon" />
          <span className={`nav-text`}>Productos</span>
        </NavLink>

        <NavLink
          to="/clientes"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <CustomerLogo className="nav-logo" />{" "}
          <span className={`nav-text`}>Clientes</span>
        </NavLink>

        <NavLink
          to="/proveedores"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <ProviderLogo className="nav-logo" />{" "}
          <span className={`nav-text`}>Proveedores</span>
        </NavLink>
        <NavLink
          to="/"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <img src={Logo} alt="" className="nav-logo" />
        </NavLink>
      </nav>
    </div>
  );
}

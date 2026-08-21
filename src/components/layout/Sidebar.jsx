import { NavLink } from "react-router-dom";
import "./css/Sidebar.css";
import Logo from "../../assets/logos/LOGO.png";
import { GiBoxUnpacking as BoxLogo } from "react-icons/gi";
import { IoPerson as CustomerLogo } from "react-icons/io5";
import { LuBaggageClaim as ProviderLogo } from "react-icons/lu";
import { FaCashRegister } from "react-icons/fa";
import { IoCash } from "react-icons/io5";
import LogoutButton from "./LogoutButton";
import { FaUsers } from "react-icons/fa";
import { FaChartLine } from "react-icons/fa";
import { useAuth } from "../../auth/AuthContext";
import {
  puedeAccederRuta,
  rutaInicialPara,
} from "../../auth/permisos";

export default function Sidebar({ open, setOpen }) {
  const { user } = useAuth();
  const mostrar = (ruta) => puedeAccederRuta(user, ruta);

  return (
    <div className={`sidebar ${open ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <NavLink to={rutaInicialPara(user)}>
          <img src={Logo} alt="" className="logo" />
        </NavLink>

        <button className="toggle-btn" onClick={() => setOpen(!open)}>
          {open ? "⟨" : "⟩"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {mostrar("/productos") && <NavLink
          to="/productos"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <BoxLogo className="nav-icon" />
          <span className={`nav-text ${!open ? "hidden" : ""}`}>Productos</span>
        </NavLink>}
        {mostrar("/clientes") && <NavLink to="/clientes" className="nav-item">
          <CustomerLogo className="nav-logo" />{" "}
          <span className={`nav-text ${!open ? "hidden" : ""}`}>Clientes</span>
        </NavLink>}
        {mostrar("/proveedores") && <NavLink to="/proveedores" className="nav-item">
          <ProviderLogo className="nav-logo" />{" "}
          <span className={`nav-text ${!open ? "hidden" : ""}`}>
            Proveedores
          </span>
        </NavLink>}
        <br />
        {mostrar("/compras") && <NavLink to="/compras" className="nav-item">
          <FaCashRegister className="nav-logo" />{" "}
          <span className={`nav-text ${!open ? "hidden" : ""}`}>Compras</span>
        </NavLink>}
        {mostrar("/ventas") && <NavLink to="/ventas" className="nav-item">
          <IoCash className="nav-logo" />{" "}
          <span className={`nav-text ${!open ? "hidden" : ""}`}>Ventas</span>
        </NavLink>}
        {mostrar("/usuarios") && (
          <NavLink to="/usuarios" className="nav-item">
            <FaUsers className="nav-logo" />
            <span className={`nav-text ${!open ? "hidden" : ""}`}>
              Usuarios
            </span>
          </NavLink>
        )}
        {mostrar("/estadisticas") && (
          <NavLink to="/estadisticas" className="nav-item">
            <FaChartLine className="nav-logo" />
            <span className={`nav-text ${!open ? "hidden" : ""}`}>
              Estadísticas
            </span>
          </NavLink>
        )}
        <LogoutButton variant="sidebar" showText={open} />
      </nav>
    </div>
  );
}

import { NavLink } from "react-router-dom";
import "./css/Lowbar.css";
import Logo from "../../assets/logos/LOGO.png";
import { GrApps as ElementsLogo } from "react-icons/gr";
import { FaCalendarCheck as EventLogo } from "react-icons/fa6";

import { useState } from "react";
import Options from "./Options";
import { linksElements, linksEvents } from "./data/Secciones.jsx";
import { useAuth } from "../../auth/AuthContext";
import {
  puedeAccederRuta,
  rutaInicialPara,
} from "../../auth/permisos";

export default function Lowbar() {
  const [options, setOptions] = useState(null);
  const { user } = useAuth();
  const elementosPermitidos = linksElements.filter((link) =>
    puedeAccederRuta(user, link.to),
  );
  const eventosPermitidos = linksEvents.filter((link) =>
    puedeAccederRuta(user, link.to),
  );

  return (
    <div className={`lowbar`}>
      <nav className="lowbar-nav">
        <button
          type="button"
          className="low-bar-link"
          onClick={() => setOptions(elementosPermitidos)}
          disabled={!elementosPermitidos.length}
        >
          <ElementsLogo className="nav-logo" />
        </button>
        <NavLink to={rutaInicialPara(user)} className="nav-item">
          <img src={Logo} alt="" className="nav-logo" />
        </NavLink>

        <button
          type="button"
          className="low-bar-link"
          onClick={() => setOptions(eventosPermitidos)}
          disabled={!eventosPermitidos.length}
        >
          <EventLogo className="nav-logo" />
        </button>
      </nav>
      {options && (
        <Options options={options} onClick={() => setOptions(null)} />
      )}
    </div>
  );
}

import { NavLink } from "react-router-dom";
import "./css/Lowbar.css";
import Logo from "../../assets/logos/LOGO.png";
import { GrApps as ElementsLogo } from "react-icons/gr";
import { FaCalendarCheck as EventLogo } from "react-icons/fa6";

import { useState } from "react";
import Options from "./Options";
import { linksElements, linksEvents } from "./data/Secciones.jsx";

export default function Lowbar() {
  const [options, setOptions] = useState(null);

  return (
    <div className={`lowbar`}>
      <nav className="lowbar-nav">
        <button
          type="button"
          className="low-bar-link"
          onClick={() => setOptions(linksElements)}
        >
          <ElementsLogo className="nav-logo" />
        </button>
        <NavLink to="/" className="nav-item">
          <img src={Logo} alt="" className="nav-logo" />
        </NavLink>

        <button
          type="button"
          className="low-bar-link"
          onClick={() => setOptions(linksEvents)}
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

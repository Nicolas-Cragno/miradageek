import { Link } from "react-router-dom";
import Logo from "../assets/logos/LOGO.png";
import "./css/NotFound.css";

export default function NotFound() {
  return (
    <main className="not-found">
      <img src={Logo} alt="Mirada Geek" />
      <p className="not-found-code">404</p>
      <h1>Esta página no existe</h1>
      <p>La dirección puede ser incorrecta o la sección fue movida.</p>
      <Link to="/">Volver al inicio</Link>
    </main>
  );
}

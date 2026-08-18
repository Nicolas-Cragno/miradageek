import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { rutaInicialPara } from "../auth/permisos";
import Logo from "../assets/logos/LOGO.png";
import "./css/NotFound.css";

export default function AccesoDenegado() {
  const { user } = useAuth();

  return (
    <main className="not-found">
      <img src={Logo} alt="Mirada Geek" />
      <p className="not-found-code">403</p>
      <h1>Acceso denegado</h1>
      <p>No tenés permisos para acceder a esta sección.</p>
      <Link to={rutaInicialPara(user)}>Volver</Link>
    </main>
  );
}

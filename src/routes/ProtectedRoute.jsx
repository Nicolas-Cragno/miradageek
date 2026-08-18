import { useAuth } from "../auth/AuthContext";
import Login from "./Login";
import Loading from "./Loading";
import AccesoDenegado from "./AccesoDenegado";
import { puedeAccederRuta } from "../auth/permisos";

export default function ProtectedRoute({ children, ruta, rolesPermitidos }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  if (!user) return <Login />;

  const rolPermitido =
    !rolesPermitidos || rolesPermitidos.includes(user.tipo);
  const rutaPermitida = !ruta || puedeAccederRuta(user, ruta);

  if (!rolPermitido || !rutaPermitida) return <AccesoDenegado />;

  return children;
}

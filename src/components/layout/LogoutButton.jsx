import { useState } from "react";
import { IoLogOutOutline } from "react-icons/io5";
import { useAuth } from "../../auth/AuthContext";
import { showConfirmation, showError } from "../../utils/alerts";
import "./css/LogoutButton.css";

export default function LogoutButton({ variant = "sidebar", showText = true }) {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    const confirmed = await showConfirmation(
      "¿Cerrar sesión?",
      "¿Seguro que querés cerrar tu sesión?",
      "Cerrar sesión",
    );

    if (!confirmed) return;

    setLoggingOut(true);

    try {
      await logout();
    } catch {
      setLoggingOut(false);
      await showError(
        "No pudimos cerrar la sesión",
        "Intentá nuevamente en unos segundos.",
      );
    }
  };

  const isSidebar = variant === "sidebar";

  return (
    <button
      type="button"
      className={isSidebar ? "nav-item logout-item" : "mobile-logout"}
      onClick={handleLogout}
      disabled={loggingOut}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
      <IoLogOutOutline className={isSidebar ? "nav-logo" : "mobile-logout-icon"} />
      {isSidebar && showText && <span className="nav-text">Cerrar sesión</span>}
    </button>
  );
}

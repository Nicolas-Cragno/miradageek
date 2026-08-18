import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Navigate } from "react-router-dom";
import { rutaInicialPara } from "../auth/permisos";
import Logo from "../assets/logos/LOGO.png";
import "./css/Login.css";
import Loading from "./Loading";
import { authErrorMessage, showError, showSuccess } from "../utils/alerts";

export default function Login() {
  const { user, login, recuperarPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      await showError("No pudimos iniciar sesión", authErrorMessage(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecuperarPassword = async () => {
    const correo = email.trim();
    if (!correo) {
      await showError(
        "Ingresá tu correo",
        "Escribí tu correo electrónico antes de solicitar la recuperación.",
      );
      return;
    }

    try {
      await recuperarPassword(correo);
      await showSuccess(
        "Solicitud enviada",
        "Si la cuenta está registrada, recibirás un correo con los próximos pasos.",
      );
    } catch (error) {
      await showError(
        "No pudimos enviar el correo",
        authErrorMessage(error.code),
      );
    }
  };

  if (user) return <Navigate to={rutaInicialPara(user)} replace />;

  if (submitting) return <Loading />;

  return (
    <div className="login">
      <img src={Logo} alt="" className="login-logo" />

      <form onSubmit={handleSubmit} className="login-form">
        <input
          placeholder="email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          className="login-mail"
        />

        <input
          placeholder="password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="login-pass"
        />

        <button className="login-btn" disabled={submitting}>Entrar</button>
        <button
          type="button"
          className="login-recovery"
          onClick={handleRecuperarPassword}
          disabled={submitting}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
  );
}

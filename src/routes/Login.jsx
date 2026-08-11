import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Logo from "../assets/logos/LOGO.png";
import "./css/Login.css";
import Loading from "./Loading";
import { authErrorMessage, showError } from "../utils/alerts";

export default function Login() {
  const { login } = useAuth();

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
      </form>
    </div>
  );
}

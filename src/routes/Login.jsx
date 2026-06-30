import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Logo from "../assets/logos/Logo.png";
import "./css/Login.css";

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      console.log("[Error] de login: ", err.message);
    }
  };

  return (
    <div className="login">
      <img src={Logo} alt="" className="login-logo" />

      <form onSubmit={handleSubmit} className="login-form">
        <input
          placeholder="email"
          onChange={(e) => setEmail(e.target.value)}
          className="login-mail"
        />

        <input
          placeholder="password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          className="login-pass"
        />

        <button className="login-btn">Entrar</button>
      </form>
    </div>
  );
}

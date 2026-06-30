import "./css/Dashboard.css";
import logo from "../assets/logos/Logo.png";
import { useAuth } from "../auth/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <section className="dashboard page">
      <div className="dashboard-content">
        <img src={logo} alt="Mirada Geek" className="dashboard-logo" />

        <h1 className="dashboard-title">¡Hola, {user?.nombre}!</h1>

        <p className="dashboard-subtitle">Bienvenido a Mirada Geek</p>
      </div>
    </section>
  );
};

export default Dashboard;

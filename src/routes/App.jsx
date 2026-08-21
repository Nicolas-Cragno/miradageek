import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Layout from "../components/layout/Layout";
import Login from "./Login";
import Productos from "../sections/Productos";
import Clientes from "../sections/Clientes";
import Proveedores from "../sections/Proveedores";
import Dashboard from "../sections/Dashboard";
import Compras from "../sections/Compras";
import Ventas from "../sections/Ventas";
import "./css/App.css";
import NotFound from "./NotFound";
import Usuarios from "../sections/Usuarios";
import Estadisticas from "../sections/Estadisticas";

const proteger = (ruta, componente) => (
  <ProtectedRoute ruta={ruta}>{componente}</ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ruta publicaa */}
        <Route path="/login" element={<Login />} />

        {/* rutas privadas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={proteger("/", <Dashboard />)} />
          <Route
            path="/productos"
            element={proteger("/productos", <Productos />)}
          />
          <Route
            path="/clientes"
            element={proteger("/clientes", <Clientes />)}
          />
          <Route
            path="/proveedores"
            element={proteger("/proveedores", <Proveedores />)}
          />
          <Route
            path="/compras"
            element={proteger("/compras", <Compras />)}
          />
          <Route
            path="/ventas"
            element={proteger("/ventas", <Ventas />)}
          />
          <Route
            path="/usuarios"
            element={proteger("/usuarios", <Usuarios />)}
          />
          <Route
            path="/estadisticas"
            element={proteger("/estadisticas", <Estadisticas />)}
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

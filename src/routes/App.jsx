import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Layout from "../components/layout/Layout";
import Login from "./Login";
import Productos from "../sections/Productos";
import Clientes from "../sections/Clientes";
import Proveedores from "../sections/Proveedores";

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
          <Route path="/productos" element={<Productos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/proveedores" element={<Proveedores />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { DataProvider } from "./DataContext";
import { ProductosProvider } from "./ProductosContext";
import { ComprasProvider } from "./ComprasContext";
import { VentasProvider } from "./VentasContext";
import { DetalleComprasProvider } from "./DetalleComprasContext";
import { DetalleVentasProvider } from "./DetalleVentasContext";
import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { esUsuarioExterno } from "../auth/permisos";

const collectionsByRoute = {
  "/": [],
  "/productos": ["productos", "tipos", "sucursales"],
  "/clientes": ["clientes"],
  "/proveedores": ["proveedores"],
  "/compras": [
    "compras",
    "detalleCompras",
    "proveedores",
    "sucursales",
    "productos",
    "tipos",
  ],
  "/ventas": [
    "ventas",
    "detalleVentas",
    "clientes",
    "sucursales",
    "productos",
    "tipos",
  ],
  "/usuarios": [
    "usuarios",
    "accesosUsuarios",
    "roles",
    "clientes",
    "proveedores",
  ],
};

const DataLayer = ({ children }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const collections = useMemo(() => {
    if (!esUsuarioExterno(user)) return collectionsByRoute[pathname] ?? [];

    if (pathname === "/productos") return ["productos", "tipos"];
    if (pathname === "/compras" && user.entidadTipo === "proveedor") {
      return [
        {
          nombre: "compras",
          filtro: { campo: "proveedor", valor: user.entidadId },
        },
        {
          nombre: "proveedores",
          filtro: { campo: "id", valor: user.entidadId },
        },
        "sucursales",
        "productos",
        "tipos",
      ];
    }
    if (pathname === "/ventas" && user.entidadTipo === "cliente") {
      return [
        {
          nombre: "ventas",
          filtro: { campo: "cliente", valor: user.entidadId },
        },
        {
          nombre: "clientes",
          filtro: { campo: "id", valor: user.entidadId },
        },
        "sucursales",
        "productos",
        "tipos",
      ];
    }
    return [];
  }, [pathname, user]);

  return (
    <DataProvider collections={collections}>
      <ProductosProvider>
        <DetalleComprasProvider>
          <DetalleVentasProvider>
            <ComprasProvider>
              <VentasProvider>{children}</VentasProvider>
            </ComprasProvider>
          </DetalleVentasProvider>
        </DetalleComprasProvider>
      </ProductosProvider>
    </DataProvider>
  );
};

export default DataLayer;

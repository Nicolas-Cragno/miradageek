import { DataProvider } from "./DataContext";
import { ProductosProvider } from "./ProductosContext";
import { ComprasProvider } from "./ComprasContext";
import { VentasProvider } from "./VentasContext";
import { DetalleComprasProvider } from "./DetalleComprasContext";
import { DetalleVentasProvider } from "./DetalleVentasContext";
import { useLocation } from "react-router-dom";

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
};

const DataLayer = ({ children }) => {
  const { pathname } = useLocation();
  const collections = collectionsByRoute[pathname] ?? [];

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

import { DataProvider } from "./DataContext";
import { ProductosProvider } from "./ProductosContext";
import { ComprasProvider } from "./ComprasContext";
import { VentasProvider } from "./VentasContext";
import { DetalleComprasProvider } from "./DetalleComprasContext";
import { DetalleVentasProvider } from "./DetalleVentasContext";

const DataLayer = ({ children }) => {
  return (
    <DataProvider>
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

import { DataProvider } from "./DataContext";
import { ProductosProvider } from "./ProductosContext";
import { ComprasProvider } from "./ComprasContext";
import { DetalleComprasProvider } from "./DetalleComprasContext";

const DataLayer = ({ children }) => {
  return (
    <DataProvider>
      <ProductosProvider>
        <DetalleComprasProvider>
          <ComprasProvider>{children}</ComprasProvider>
        </DetalleComprasProvider>
      </ProductosProvider>
    </DataProvider>
  );
};

export default DataLayer;

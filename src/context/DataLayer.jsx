import { DataProvider } from "./DataContext";
import { ProductosProvider } from "./ProductosContext";
import { ComprasProvider } from "./ComprasContext";

const DataLayer = ({ children }) => {
  return (
    <DataProvider>
      <ProductosProvider>
        <ComprasProvider>{children}</ComprasProvider>
      </ProductosProvider>
    </DataProvider>
  );
};

export default DataLayer;

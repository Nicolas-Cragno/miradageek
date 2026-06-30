import { DataProvider } from "./DataContext";
import { ProductosProvider } from "./ProductosContext";

const DataLayer = ({ children }) => {
  return (
    <DataProvider>
      <ProductosProvider>{children}</ProductosProvider>
    </DataProvider>
  );
};

export default DataLayer;

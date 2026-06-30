import { createContext, useContext, useMemo } from "react";
import { useData } from "./DataContext";
import { formatearCampoFirestore } from "../functions/DataFunctions";

const DetalleComprasContext = createContext();

export function DetalleComprasProvider({ children }) {
  const { detalleCompras = [], productos = [] } = useData();

  const detalleComprasEnriquecidos = useMemo(() => {
    return detalleCompras.map((dc) => {
      const prod = productos.find((pd) => pd.id === dc.producto);
      const lbl = `${prod.id} - ${prod.descripcion} (x ${dc.cantidad || 0})`;
      return {
        ...dc,
        labelProducto: prod?.descripcion || "",
        label: lbl,
      };
    });
  }, [detalleCompras, productos]);

  return (
    <DetalleComprasContext.Provider
      value={{ detalleCompras: detalleComprasEnriquecidos }}
    >
      {children}
    </DetalleComprasContext.Provider>
  );
}

export const useDetalleCompras = () => useContext(DetalleComprasContext);

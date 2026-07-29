import { createContext, useContext, useMemo } from "react";
import { useData } from "./DataContext";
import { formatearCampoFirestore } from "../functions/DataFunctions";

const DetalleVentasContext = createContext();

export function DetalleVentasProvider({ children }) {
  const { detalleVentas = [], productos = [] } = useData();

  const detalleVentasEnriquecidos = useMemo(() => {
    return detalleVentas.map((dc) => {
      const prod = productos.find((pd) => pd.id === dc.idProducto);
      const lbl = prod
        ? `${prod.id} - ${prod.descripcion} (x ${dc.cantidad || 0})`
        : `Producto eliminado (${dc.idProducto}) (x ${dc.cantidad || 0})`;
      return {
        ...dc,
        labelProducto: prod?.descripcion || "",
        label: lbl,
      };
    });
  }, [detalleVentas, productos]);

  return (
    <DetalleVentasContext.Provider
      value={{ detalleVentas: detalleVentasEnriquecidos }}
    >
      {children}
    </DetalleVentasContext.Provider>
  );
}

export const useDetalleVentas = () => useContext(DetalleVentasContext);

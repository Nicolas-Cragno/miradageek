import { createContext, useContext, useMemo } from "react";
import { useData } from "./DataContext";
import monedas from "../data/monedas.json";

const ProductosContext = createContext();

export function ProductosProvider({ children }) {
  const { productos = [], tipos = [] } = useData();

  const productosEnriquecidos = useMemo(() => {
    return productos.map((pd) => {
      const monedaCosto = monedas.find((mn) => mn.key === pd.monedaCosto);

      const monedaPrecio = monedas.find((mn) => mn.key === pd.monedaPrecio);

      const tipo = tipos.find((tp) => tp.id === pd.tipo);

      return {
        ...pd,

        labelCosto: `${monedaCosto?.simbolo || "$"} ${pd.costo ?? 0}`,
        labelPrecio: `${monedaPrecio?.simbolo || "$"} ${pd.precio ?? 0}`,

        labelTipo: tipo
          ? `${tipo.nombre} (${tipo.detalle})`
          : "Sin especificar",
      };
    });
  }, [productos, tipos]);

  return (
    <ProductosContext.Provider value={{ productos: productosEnriquecidos }}>
      {children}
    </ProductosContext.Provider>
  );
}

export const useProductos = () => useContext(ProductosContext);

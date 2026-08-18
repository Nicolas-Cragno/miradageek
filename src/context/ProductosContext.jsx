import { createContext, useContext, useMemo } from "react";
import { useData } from "./DataContext";
import monedas from "../data/monedas.json";

const ProductosContext = createContext();

export function ProductosProvider({ children }) {
  const { productos = [], tipos = [] } = useData();

  const productosEnriquecidos = useMemo(() => {
    return productos
      .map((pd) => {
        const monedaCosto = monedas.find((mn) => mn.key === pd.monedaCosto);

        const monedaPrecio = monedas.find((mn) => mn.key === pd.monedaPrecio);

        const tipo = tipos.find((tp) => tp.id === pd.tipo);

        return {
          ...pd,
          stock: Number(pd.stock ?? 0),
          pendiente: Number(pd.pendiente ?? 0),
          reservado: Number(pd.reservado ?? 0),
          disponible:
            Number(pd.stock ?? 0) - Number(pd.reservado ?? 0),
          stockSucursal: Array.isArray(pd.stockSucursal) ? pd.stockSucursal : [],

          labelCosto: `${monedaCosto?.simbolo || "$"} ${pd.costo ?? 0}`,
          labelPrecio: `${monedaPrecio?.simbolo || "$"} ${pd.precio ?? 0}`,

          labelTipo: tipo
            ? `${tipo.nombre} (${tipo.detalle})`
            : "Sin especificar",
        };
      })
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [productos, tipos]);

  return (
    <ProductosContext.Provider value={{ productos: productosEnriquecidos }}>
      {children}
    </ProductosContext.Provider>
  );
}

export const useProductos = () => useContext(ProductosContext);

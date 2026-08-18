import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useData } from "./DataContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../auth/AuthContext";
import { esUsuarioExterno } from "../auth/permisos";

const DetalleComprasContext = createContext();

export function DetalleComprasProvider({ children }) {
  const { detalleCompras = [], compras = [], productos = [] } = useData();
  const { user } = useAuth();
  const [detallesPropios, setDetallesPropios] = useState([]);
  const esProveedorExterno =
    esUsuarioExterno(user) && user.entidadTipo === "proveedor";

  useEffect(() => {
    if (!esProveedorExterno) return undefined;

    const detallesPorCompra = new Map();
    const actualizar = () =>
      setDetallesPropios([...detallesPorCompra.values()].flat());
    const cancelaciones = compras.map((compra) =>
      onSnapshot(
        query(
          collection(db, "detalleCompras"),
          where("compra", "==", compra.id),
        ),
        (snapshot) => {
          detallesPorCompra.set(
            compra.id,
            snapshot.docs.map((item) => ({ ...item.data(), id: item.id })),
          );
          actualizar();
        },
      ),
    );

    return () => cancelaciones.forEach((cancelar) => cancelar());
  }, [compras, esProveedorExterno]);

  const detallesDisponibles = esProveedorExterno
    ? detallesPropios
    : detalleCompras;

  const detalleComprasEnriquecidos = useMemo(() => {
    return detallesDisponibles.filter((dc) => dc.activo !== false).map((dc) => {
      const prod = productos.find((pd) => pd.id === dc.idProducto);
      const lbl = prod
        ? `${prod.id} - ${prod.descripcion} (x ${dc.cantidad || 0})`
        : `Producto eliminado (${dc.idProducto}) (x ${dc.cantidad || 0})`;
      return {
        ...dc,
        cantidadCumplida: Number(dc.cantidadCumplida ?? dc.cantidad ?? 0),
        labelProducto: prod?.descripcion || "",
        label: lbl,
      };
    });
  }, [detallesDisponibles, productos]);

  return (
    <DetalleComprasContext.Provider
      value={{ detalleCompras: detalleComprasEnriquecidos }}
    >
      {children}
    </DetalleComprasContext.Provider>
  );
}

export const useDetalleCompras = () => useContext(DetalleComprasContext);

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useData } from "./DataContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../auth/AuthContext";
import { esUsuarioExterno } from "../auth/permisos";

const DetalleVentasContext = createContext();

export function DetalleVentasProvider({ children }) {
  const { detalleVentas = [], ventas = [], productos = [] } = useData();
  const { user } = useAuth();
  const [detallesPropios, setDetallesPropios] = useState([]);
  const esClienteExterno =
    esUsuarioExterno(user) && user.entidadTipo === "cliente";

  useEffect(() => {
    if (!esClienteExterno) return undefined;

    const detallesPorVenta = new Map();
    const actualizar = () =>
      setDetallesPropios([...detallesPorVenta.values()].flat());
    const cancelaciones = ventas.map((venta) =>
      onSnapshot(
        query(
          collection(db, "detalleVentas"),
          where("venta", "==", venta.id),
        ),
        (snapshot) => {
          detallesPorVenta.set(
            venta.id,
            snapshot.docs.map((item) => ({ ...item.data(), id: item.id })),
          );
          actualizar();
        },
      ),
    );

    return () => cancelaciones.forEach((cancelar) => cancelar());
  }, [ventas, esClienteExterno]);

  const detallesDisponibles = esClienteExterno
    ? detallesPropios
    : detalleVentas;

  const detalleVentasEnriquecidos = useMemo(() => {
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
    <DetalleVentasContext.Provider
      value={{ detalleVentas: detalleVentasEnriquecidos }}
    >
      {children}
    </DetalleVentasContext.Provider>
  );
}

export const useDetalleVentas = () => useContext(DetalleVentasContext);

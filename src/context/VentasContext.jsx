import { createContext, useContext, useMemo } from "react";
import { useData } from "./DataContext";
import { useDetalleVentas } from "./DetalleVentasContext";
import monedas from "../data/monedas.json";
import estados from "../data/estados.json";
import { formatearCampoFirestore } from "../functions/DataFunctions";
import { estadoVisible } from "../functions/operaciones/modeloOperaciones";

const VentasContext = createContext();

export function VentasProvider({ children }) {
  const { ventas = [], clientes = [], sucursales = [] } = useData();
  const { detalleVentas = [] } = useDetalleVentas();

  const ventasEnriquecidos = useMemo(() => {
    return ventas.map((cp) => {
      const monedaCosto = monedas.find((mn) => mn.key === cp.moneda);
      const estadoOperacion = estadoVisible(cp);
      const estado = estados.find((st) => st.key === estadoOperacion);
      const cli = clientes.find((pv) => pv.id === cp.cliente);
      const sucu = sucursales.find((sc) => sc.id === cp.sucursal);
      const date = formatearCampoFirestore(cp.fecha);
      const lbl = `${date} | ${cli?.nombre || ""} (${estado?.label})`;
      const detalles = detalleVentas.filter((dc) => dc.venta === cp.id);

      return {
        ...cp,
        detalleVentas: detalles,
        labelFecha: date || "",
        labelMonto: `${monedaCosto?.simbolo || "$"} ${cp.monto ?? 0}`,
        labelCliente: cli?.nombre || "",
        labelSucursal: sucu?.nombre || "",
        estado: estadoOperacion,
        labelEstado: estado?.label || estadoOperacion,
        label: lbl,
      };
    });
  }, [ventas, detalleVentas, clientes, sucursales]);

  return (
    <VentasContext.Provider value={{ ventas: ventasEnriquecidos }}>
      {children}
    </VentasContext.Provider>
  );
}

export const useVentas = () => useContext(VentasContext);

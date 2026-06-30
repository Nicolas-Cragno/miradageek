import { createContext, useContext, useMemo } from "react";
import { useData } from "./DataContext";
import { useDetalleCompras } from "./DetalleComprasContext";
import monedas from "../data/monedas.json";
import estados from "../data/estados.json";
import { formatearCampoFirestore } from "../functions/DataFunctions";

const ComprasContext = createContext();

export function ComprasProvider({ children }) {
  const { compras = [], proveedores = [], sucursales = [] } = useData();
  const { detalleCompras = [] } = useDetalleCompras();

  const comprasEnriquecidos = useMemo(() => {
    return compras.map((cp) => {
      const monedaCosto = monedas.find((mn) => mn.key === cp.moneda);
      const estado = estados.find((st) => st.key === cp.estado);
      const prov = proveedores.find((pv) => pv.id === cp.proveedor);
      const sucu = sucursales.find((sc) => sc.id === cp.sucursal);
      const date = formatearCampoFirestore(cp.fecha);
      const lbl = `${date} | ${prov?.nombre || ""} (${estado?.label})`;
      const detalles = detalleCompras.filter((dc) => dc.compra === cp.id);

      return {
        ...cp,
        detalleCompras: detalles,
        labelFecha: date || "",
        labelMonto: `${monedaCosto?.simbolo || "$"} ${cp.monto ?? 0}`,
        labelProveedor: prov?.nombre || "",
        labelSucursal: sucu?.nombre || "",
        labelEstado: estado?.label || "",
        label: lbl,
      };
    });
  }, [compras, detalleCompras, proveedores, sucursales]);

  return (
    <ComprasContext.Provider value={{ compras: comprasEnriquecidos }}>
      {children}
    </ComprasContext.Provider>
  );
}

export const useCompras = () => useContext(ComprasContext);

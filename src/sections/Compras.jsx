import { useCompras } from "../context/ComprasContext";
import Section from "./Section";
import campos from "../data/campos/camposCompras.json";
import AccionesOperacion from "../components/operaciones/AccionesOperacion";
import { filtrosOperaciones } from "../config/filtrosTablas";

export default function Compras() {
  const { compras } = useCompras();

  return (
    <Section
      data={compras}
      campos={campos}
      title="Compras / Pedidos realizados"
      collection="compras"
      detailCollection="detalleCompras"
      detailRef="compra"
      filtros={filtrosOperaciones}
      renderActions={(operacion) => (
        <AccionesOperacion operacion={operacion} coleccion="compras" />
      )}
    />
  );
}

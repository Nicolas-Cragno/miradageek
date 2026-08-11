import { useVentas } from "../context/VentasContext";
import Section from "./Section";
import campos from "../data/campos/camposVentas.json";

export default function Ventas() {
  const { ventas } = useVentas();

  return (
    <Section
      data={ventas}
      campos={campos}
      title="Ventas realizadas"
      collection="ventas"
      detailCollection="detalleVentas"
      detailRef="venta"
    />
  );
}

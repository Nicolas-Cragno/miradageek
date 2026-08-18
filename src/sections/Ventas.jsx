import { useVentas } from "../context/VentasContext";
import Section from "./Section";
import campos from "../data/campos/camposVentas.json";
import AccionesOperacion from "../components/operaciones/AccionesOperacion";

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
      renderActions={(operacion) => (
        <AccionesOperacion operacion={operacion} coleccion="ventas" />
      )}
    />
  );
}

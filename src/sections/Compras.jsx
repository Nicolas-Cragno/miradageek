import { useData } from "../context/DataContext";
import { useCompras } from "../context/ComprasContext";
import Section from "./Section";
import campos from "../data/campos/camposCompras.json";

export default function Compras() {
  const { compras } = useCompras();

  return (
    <Section
      data={compras}
      campos={campos}
      title="Compras / Pedidos realizados"
      collection="compras"
    />
  );
}

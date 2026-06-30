import { useProductos } from "../context/ProductosContext";
import Section from "./Section";
import campos from "../data/campos/camposProductos.json";

export default function Productos() {
  const { productos = [] } = useProductos();

  return (
    <Section
      data={productos}
      campos={campos}
      title="Productos"
      collection="productos"
    />
  );
}

import { useState } from "react";
import { useData } from "../context/DataContext";
import Section from "./Section";
import campos from "../data/campos/camposProveedores.json";

export default function Proveedores() {
  const { proveedores = [] } = useData();

  return (
    <Section
      data={proveedores}
      campos={campos}
      title="Proveedores"
      collection="proveedores"
    />
  );
}

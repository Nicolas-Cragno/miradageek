import { useState } from "react";
import { useData } from "../context/DataContext";
import Section from "./Section";
import campos from "../data/campos/camposClientes.json";

export default function Clientes() {
  const { clientes = [] } = useData();

  return (
    <Section
      data={clientes}
      campos={campos}
      title="Clientes"
      collection="clientes"
    />
  );
}

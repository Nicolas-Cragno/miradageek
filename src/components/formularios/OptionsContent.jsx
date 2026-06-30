import { useData } from "../../context/DataContext";

export default function OptionsContent({ options }) {
  const data = useData();

  if (!options) return null;

  const collectionData = data[options] || [];

  return (
    <>
      <option value="">Seleccionar...</option>

      {collectionData.map((item) => (
        <option key={item.id} value={item.id}>
          {item.nombre ?? item.descripcion ?? item.label ?? item.id}
        </option>
      ))}
    </>
  );
}

import { useMemo, useState } from "react";
import { FiSearch as SearchLogo } from "react-icons/fi";
import "./css/Tabla.css";
import { formatearCampoFirestore } from "../../functions/DataFunctions";

export default function Tabla({ data = [], campos = [], onSelect }) {
  const [busqueda, setBusqueda] = useState("");

  const camposTabla = campos.filter((c) => c.tabla);

  const datosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return data;

    const texto = busqueda.toLowerCase();

    return data.filter((item) =>
      camposTabla.some((campo) => {
        const valor = item[campo.key];

        if (valor === null || valor === undefined) return false;

        return String(valor).toLowerCase().includes(texto);
      }),
    );
  }, [data, busqueda, camposTabla]);

  if (!data.length) {
    return <p className="tabla-empty">...</p>;
  }

  return (
    <div className="tabla-container">
      <div className="tabla-search">
        <input
          type="text"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="search-input"
        />
        <SearchLogo className="tabla-search-icon" />
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              {camposTabla.map((campo) => (
                <th key={campo.key}>{formatearCampoFirestore(campo.label)}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {datosFiltrados.map((item, index) => (
              <tr key={item.id || index} onClick={() => onSelect?.(item)}>
                {camposTabla.map((campo) => (
                  <td key={campo.key}>
                    {formatValue(formatearCampoFirestore(item[campo.key]))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!datosFiltrados.length && (
        <p className="tabla-empty">No se encontraron resultados.</p>
      )}
    </div>
  );
}

function formatValue(value) {
  if (value === null || value === undefined) return "-";

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

import "./css/Tabla.css";

export default function Tabla({ data = [], campos = [], onSelect }) {
  if (!data.length) {
    return <p className="tabla-empty">Sin datos para mostrar</p>;
  }

  // Solo los campos que van en la tabla
  const camposTabla = campos.filter((c) => c.tabla);

  return (
    <div className="tabla-container">
      <table className="tabla">
        <thead>
          <tr>
            {camposTabla.map((campo) => (
              <th key={campo.key}>{campo.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr key={item.id || index} onClick={() => onSelect?.(item)}>
              {camposTabla.map((campo) => (
                <td key={campo.key}>{formatValue(item[campo.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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

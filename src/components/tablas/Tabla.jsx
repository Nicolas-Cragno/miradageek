import { useMemo, useState } from "react";
import { FiSearch as SearchLogo } from "react-icons/fi";
import "./css/Tabla.css";
import { formatearCampoFirestore } from "../../functions/DataFunctions";

const fechaEnMilisegundos = (valor) => {
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor?.toMillis === "function") return valor.toMillis();
  if (typeof valor?.toDate === "function") return valor.toDate().getTime();
  if (typeof valor?.seconds === "number") {
    return valor.seconds * 1000 + Number(valor.nanoseconds || 0) / 1_000_000;
  }
  if (typeof valor === "string") return Date.parse(valor);
  return Number.NaN;
};

export default function Tabla({
  data = [],
  campos = [],
  onSelect,
  filtros = [],
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtrosSeleccionados, setFiltrosSeleccionados] = useState({});

  const camposTabla = useMemo(() => campos.filter((c) => c.tabla), [campos]);

  const datosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtrosActivos = filtros
      .map((filtro) => {
        const valorSeleccionado =
          filtrosSeleccionados[filtro.id] ?? filtro.options?.[0]?.value;
        return filtro.options?.find(
          (option) => option.value === valorSeleccionado,
        )?.filter;
      })
      .filter((filter) => typeof filter === "function");

    const resultados = !texto && !filtrosActivos.length
      ? data
      : data.filter((item) => {
        if (!filtrosActivos.every((filter) => filter(item))) return false;
        if (!texto) return true;

        return camposTabla.some((campo) => {
          const valor = item[campo.key];

          if (valor === null || valor === undefined) return false;

          return String(valor).toLowerCase().includes(texto);
        });
      });

    if (!camposTabla.some((campo) => campo.key === "fecha")) return resultados;

    return [...resultados].sort((a, b) => {
      const fechaA = fechaEnMilisegundos(a.fecha);
      const fechaB = fechaEnMilisegundos(b.fecha);
      const validaA = Number.isFinite(fechaA);
      const validaB = Number.isFinite(fechaB);

      if (!validaA && !validaB) return 0;
      if (!validaA) return 1;
      if (!validaB) return -1;
      return fechaB - fechaA;
    });
  }, [data, busqueda, camposTabla, filtros, filtrosSeleccionados]);

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

        {filtros.map((filtro) => (
          <label className="tabla-filter" key={filtro.id}>
            <span>{filtro.label}</span>
            <select
              value={
                filtrosSeleccionados[filtro.id] ??
                filtro.options?.[0]?.value ??
                ""
              }
              onChange={(event) =>
                setFiltrosSeleccionados((seleccionados) => ({
                  ...seleccionados,
                  [filtro.id]: event.target.value,
                }))
              }
            >
              {filtro.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
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

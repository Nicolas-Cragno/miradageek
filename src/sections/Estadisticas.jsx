import { useMemo } from "react";
import { useData } from "../context/DataContext";
import {
  acumularMetricas,
  calcularMetricas,
  calcularVariacion,
  etiquetaMes,
  normalizarMeses,
  obtenerUltimosMeses,
} from "../functions/operaciones/estadisticasPresentacion";
import "./css/Estadisticas.css";

const dinero = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const porcentaje = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const entero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

const fecha = (valor) => {
  const date = valor?.toDate?.() ?? (valor instanceof Date ? valor : null);
  if (!date || Number.isNaN(date.getTime())) return "Sin ventas registradas";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
};

const camposMetricas = [
  ["ventas", "Ventas", (valor) => entero.format(valor)],
  ["totalPrecios", "Facturación", (valor) => dinero.format(valor)],
  ["totalCostos", "Costos", (valor) => dinero.format(valor)],
  ["ganancia", "Ganancia", (valor) => dinero.format(valor)],
  ["margen", "Margen", (valor) => `${porcentaje.format(valor)} %`],
  ["ticketPromedio", "Ticket promedio", (valor) => dinero.format(valor)],
];

function Metricas({ datos, compactas = false }) {
  return (
    <dl className={`stats-metrics ${compactas ? "stats-metrics-compact" : ""}`}>
      {camposMetricas.map(([campo, label, formatear]) => (
        <div key={campo}><dt>{label}</dt><dd>{formatear(datos[campo])}</dd></div>
      ))}
    </dl>
  );
}

function Comparacion({ actual, anterior }) {
  const campos = [
    ["ventas", "Ventas", entero], ["totalPrecios", "Facturación", dinero],
    ["totalCostos", "Costos", dinero], ["ganancia", "Ganancia", dinero],
  ];
  return (
    <div className="stats-comparison-grid">
      {campos.map(([campo, label, formato]) => {
        const variacion = calcularVariacion(actual[campo], anterior[campo]);
        return (
          <div className="stats-comparison" key={campo}>
            <span>{label}</span><strong>{formato.format(actual[campo])}</strong>
            <small className={variacion === null ? "neutral" : variacion >= 0 ? "positive" : "negative"}>
              {variacion === null ? "Sin base de comparación" : `${variacion >= 0 ? "+" : ""}${porcentaje.format(variacion)} % vs. mes anterior`}
            </small>
          </div>
        );
      })}
    </div>
  );
}

export default function Estadisticas() {
  const {
    canalesVentas = [],
    estadisticasVentas = null,
    loading,
    error,
  } = useData();
  const claves = useMemo(() => obtenerUltimosMeses(4), []);
  const periodos = normalizarMeses(estadisticasVentas?.meses, claves);
  const actual = periodos.at(-1);
  const anterior = periodos.at(-2);
  const acumulado = acumularMetricas(periodos);
  const canales = [...canalesVentas].sort((a, b) => a.id.localeCompare(b.id));

  if (loading) return <p className="stats-status">Cargando estadísticas…</p>;
  if (error) {
    return (
      <section className="estadisticas page">
        <header className="stats-header">
          <div><p className="stats-eyebrow">Resumen administrativo</p><h1>Estadísticas</h1></div>
          <span>Importes expresados en ARS</span>
        </header>
        <p className="stats-alert">No se pudieron cargar las estadísticas.</p>
      </section>
    );
  }

  return (
    <section className="estadisticas page">
      <header className="stats-header">
        <div><p className="stats-eyebrow">Resumen administrativo</p><h1>Estadísticas</h1></div>
        <span>Importes expresados en ARS</span>
      </header>
      {(!estadisticasVentas || !Object.keys(estadisticasVentas.meses || {}).length) && (
        <p className="stats-alert">No existen datos mensuales todavía.</p>
      )}

      <article className="stats-summary">
        <div className="stats-section-title"><div><p className="stats-eyebrow">Mes actual</p><h2>{etiquetaMes(actual.clave)}</h2></div></div>
        <Metricas datos={actual} />
        <h3>Comparación mensual</h3>
        <Comparacion actual={actual} anterior={anterior} />
      </article>

      <section className="stats-block">
        <div className="stats-section-title"><div><p className="stats-eyebrow">Evolución</p><h2>Últimos 4 meses</h2></div></div>
        <div className="stats-month-grid">
          {periodos.map((periodo) => (
            <article className={`stats-card stats-month-card ${periodo.clave === actual.clave ? "current" : ""}`} key={periodo.clave}>
              <h3>{etiquetaMes(periodo.clave)}</h3><Metricas datos={periodo} compactas />
            </article>
          ))}
        </div>
      </section>

      <article className="stats-period">
        <div><p className="stats-eyebrow">Acumulado</p><h2>Período de cuatro meses</h2></div>
        <Metricas datos={acumulado} />
      </article>

      <section className="stats-block">
        <div className="stats-section-title">
          <div><p className="stats-eyebrow">Acumulados históricos</p><h2>Canales de venta</h2></div>
          <span>No representan valores mensuales</span>
        </div>
        <div className="stats-grid">
          {canales.map((canal) => (
            <article className="stats-card" key={canal.id}>
              <div className="stats-card-title"><h3>{canal.nombre || canal.id}</h3>{!canal.estado && <span>Inactivo</span>}</div>
              <Metricas datos={calcularMetricas(canal)} compactas />
              <p className="stats-last-sale">Última venta: <strong>{fecha(canal.ultimaVenta)}</strong></p>
            </article>
          ))}
          {canales.length === 0 && <p className="stats-empty">No hay canales de venta disponibles.</p>}
        </div>
      </section>
    </section>
  );
}

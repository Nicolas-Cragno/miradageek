import { useData } from "../context/DataContext";
import { CANAL_GENERAL_ID } from "../functions/operaciones/estadisticasVentas";
import "./css/Estadisticas.css";

const dinero = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const mesActual = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${partes.find((parte) => parte.type === "year")?.value}-${partes.find((parte) => parte.type === "month")?.value}`;
};

const tituloMes = (clave) => {
  const [year, month] = clave.split("-").map(Number);
  const texto = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const fecha = (valor) => {
  const date = valor?.toDate?.();
  return date
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(date)
    : "—";
};

const Metricas = ({ datos }) => {
  const precios = Number(datos?.totalPrecios || 0);
  const costos = Number(datos?.totalCostos || 0);
  return (
    <dl className="stats-metrics">
      <div><dt>Ventas</dt><dd>{Number(datos?.ventas || 0)}</dd></div>
      <div><dt>Facturación</dt><dd>{dinero.format(precios)}</dd></div>
      <div><dt>Costos</dt><dd>{dinero.format(costos)}</dd></div>
      <div><dt>Ganancia</dt><dd>{dinero.format(precios - costos)}</dd></div>
    </dl>
  );
};

export default function Estadisticas() {
  const { canalesVentas = [], loading } = useData();
  const claveMes = mesActual();
  const general = canalesVentas.find((canal) => canal.id === CANAL_GENERAL_ID);
  const resumen = general?.meses?.[claveMes] || {};
  const canales = canalesVentas
    .filter((canal) => canal.id !== CANAL_GENERAL_ID)
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <section className="estadisticas page">
      <header className="stats-header">
        <div>
          <p className="stats-eyebrow">Resumen general</p>
          <h1>Estadísticas</h1>
        </div>
        <span>Importes expresados en ARS</span>
      </header>

      <article className="stats-summary">
        <h2>{tituloMes(claveMes)}</h2>
        <Metricas datos={resumen} />
      </article>

      <div className="stats-grid" aria-busy={loading}>
        {canales.map((canal) => (
          <article className="stats-card" key={canal.id}>
            <div className="stats-card-title">
              <h2>{canal.nombre}</h2>
              {!canal.estado && <span>Inactivo</span>}
            </div>
            <Metricas datos={canal} />
            <p className="stats-last-sale">
              Última venta: <strong>{fecha(canal.ultimaVenta)}</strong>
            </p>
          </article>
        ))}
        {!loading && canales.length === 0 && (
          <p className="stats-empty">No hay canales de venta disponibles.</p>
        )}
      </div>
    </section>
  );
}

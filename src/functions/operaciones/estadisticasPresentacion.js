const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

export const numeroEstadistica = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

export const obtenerUltimosMeses = (cantidad = 4, ahora = new Date()) => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(ahora);
  const year = Number(partes.find((parte) => parte.type === "year")?.value);
  const month = Number(partes.find((parte) => parte.type === "month")?.value);

  return Array.from({ length: cantidad }, (_, indice) => {
    const fecha = new Date(Date.UTC(year, month - cantidad + indice, 15));
    return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
  });
};

export const etiquetaMes = (clave) => {
  const [year, month] = String(clave).split("-").map(Number);
  if (!year || !month) return "Mes inválido";
  const texto = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: ZONA_HORARIA,
  }).format(new Date(Date.UTC(year, month - 1, 15)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export const calcularMetricas = (datos = {}) => {
  const ventas = numeroEstadistica(datos.ventas);
  const totalPrecios = numeroEstadistica(datos.totalPrecios);
  const totalCostos = numeroEstadistica(datos.totalCostos);
  const ganancia = totalPrecios - totalCostos;
  return {
    ventas,
    totalPrecios,
    totalCostos,
    ganancia,
    margen: totalPrecios > 0 ? (ganancia / totalPrecios) * 100 : 0,
    ticketPromedio: ventas > 0 ? totalPrecios / ventas : 0,
  };
};

export const normalizarMeses = (meses, claves) =>
  claves.map((clave) => ({ clave, ...calcularMetricas(meses?.[clave]) }));

export const calcularVariacion = (actual, anterior) => {
  const base = numeroEstadistica(anterior);
  if (base === 0) return null;
  return ((numeroEstadistica(actual) - base) / Math.abs(base)) * 100;
};

export const acumularMetricas = (periodos) =>
  calcularMetricas(
    periodos.reduce(
      (total, periodo) => ({
        ventas: total.ventas + periodo.ventas,
        totalPrecios: total.totalPrecios + periodo.totalPrecios,
        totalCostos: total.totalCostos + periodo.totalCostos,
      }),
      { ventas: 0, totalPrecios: 0, totalCostos: 0 },
    ),
  );

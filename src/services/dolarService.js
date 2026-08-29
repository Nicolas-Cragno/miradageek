const ENDPOINT_DOLAR_OFICIAL = "https://dolarapi.com/v1/dolares/oficial";
const DURACION_CACHE = 5 * 60 * 1000;

let cotizacionCache = null;
let solicitudEnCurso = null;

export async function obtenerVentaDolarOficial() {
  if (
    cotizacionCache &&
    Date.now() - cotizacionCache.fecha < DURACION_CACHE
  ) {
    return cotizacionCache.valor;
  }

  if (solicitudEnCurso) return solicitudEnCurso;

  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), 6000);

  solicitudEnCurso = (async () => {
    try {
      const respuesta = await fetch(ENDPOINT_DOLAR_OFICIAL, {
        signal: controlador.signal,
      });
      if (!respuesta.ok) throw new Error("DolarAPI no respondió correctamente.");
      const cotizacion = await respuesta.json();
      const venta = Number(cotizacion?.venta);
      if (!Number.isFinite(venta) || venta <= 0) {
        throw new Error("DolarAPI devolvió una cotización inválida.");
      }
      cotizacionCache = { valor: venta, fecha: Date.now() };
      return venta;
    } finally {
      clearTimeout(timeout);
      solicitudEnCurso = null;
    }
  })();

  return solicitudEnCurso;
}

export async function obtenerValorDivisa(moneda) {
  if (moneda === "ARS") return 1;
  if (moneda === "USD") {
    const cotizacion = await obtenerVentaDolarOficial();
    if (!Number.isFinite(cotizacion) || cotizacion <= 0 || cotizacion === 1) {
      throw new Error("No se obtuvo una cotización USD válida.");
    }
    return cotizacion;
  }
  throw new Error(`No existe una cotización configurada para ${moneda}.`);
}

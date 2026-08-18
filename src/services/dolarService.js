const ENDPOINT_DOLAR_OFICIAL = "https://dolarapi.com/v1/dolares/oficial";

export async function obtenerVentaDolarOficial() {
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), 6000);
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
    return venta;
  } finally {
    clearTimeout(timeout);
  }
}

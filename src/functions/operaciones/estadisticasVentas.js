import { doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { numeroSeguro } from "./modeloOperaciones";

export const CANAL_GENERAL_ID = "CV-A0000";
export const CANAL_OTROS_ID = "CV-A0004";
export const VERSION_ESTADISTICAS = 1;

const redondearMoneda = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

const mesEnArgentina = (fecha) => {
  const date = fecha?.toDate?.() ?? (fecha instanceof Date ? fecha : null);
  if (!date || Number.isNaN(date.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = partes.find((parte) => parte.type === "year")?.value;
  const month = partes.find((parte) => parte.type === "month")?.value;
  return year && month ? `${year}-${month}` : null;
};

const timestampMillis = (fecha) => fecha?.toMillis?.() ?? 0;

export const normalizarMoneda = (moneda) => {
  const valor = String(moneda ?? "ARS").trim().toUpperCase();
  if (["ARS", "PESO", "PESOS"].includes(valor)) return "ARS";
  if (["USD", "DOLARES", "DÓLARES"].includes(valor)) return "USD";
  throw new Error(`Moneda no soportada: ${moneda}.`);
};

export const crearHuellaVacia = (canal) => ({
  version: VERSION_ESTADISTICAS,
  contabilizable: true,
  canal,
  ventas: 0,
  totalCostos: 0,
  totalPrecios: 0,
  meses: {},
});

export const calcularHuellaVenta = ({ venta, detalles }) => {
  const huella = crearHuellaVacia(venta.canal);
  const descuento = numeroSeguro(venta.descuento);
  const factorDescuento = 1 - descuento / 100;
  const monedaVenta = normalizarMoneda(venta.moneda);
  const valorDivisaVenta = monedaVenta === "USD"
    ? numeroSeguro(venta.valorDivisa)
    : 1;
  if (
    monedaVenta === "USD" &&
    (!Number.isFinite(valorDivisaVenta) || valorDivisaVenta <= 0 || valorDivisaVenta === 1)
  ) {
    return { ...huella, contabilizable: false };
  }
  let primeraFecha = null;
  let ultimaFecha = null;

  for (const detalle of detalles.filter((item) => item.activo !== false)) {
    const precioPesos = numeroSeguro(detalle.precio) * valorDivisaVenta;
    const costoPesos = numeroSeguro(detalle.costoEnPesos, Number.NaN);
    if (!Number.isFinite(costoPesos)) {
      return { ...huella, contabilizable: false };
    }

    for (const cumplimiento of detalle.cumplimientos || []) {
      const cantidad = numeroSeguro(cumplimiento.cantidad);
      const mes = mesEnArgentina(cumplimiento.fecha);
      if (cantidad <= 0 || !mes) continue;

      const actual = huella.meses[mes] || {
        ventas: 0,
        totalCostos: 0,
        totalPrecios: 0,
      };
      actual.totalCostos = redondearMoneda(
        actual.totalCostos + cantidad * costoPesos,
      );
      actual.totalPrecios = redondearMoneda(
        actual.totalPrecios + cantidad * precioPesos * factorDescuento,
      );
      huella.meses[mes] = actual;

      if (!primeraFecha || timestampMillis(cumplimiento.fecha) < timestampMillis(primeraFecha)) {
        primeraFecha = cumplimiento.fecha;
      }
      if (!ultimaFecha || timestampMillis(cumplimiento.fecha) > timestampMillis(ultimaFecha)) {
        ultimaFecha = cumplimiento.fecha;
      }
    }
  }

  if (primeraFecha) {
    const primerMes = mesEnArgentina(primeraFecha);
    huella.ventas = 1;
    huella.mesPrimeraVenta = primerMes;
    huella.ultimaVenta = ultimaFecha;
    huella.meses[primerMes].ventas = 1;
  }

  huella.totalCostos = redondearMoneda(
    Object.values(huella.meses).reduce((total, mes) => total + mes.totalCostos, 0),
  );
  huella.totalPrecios = redondearMoneda(
    Object.values(huella.meses).reduce((total, mes) => total + mes.totalPrecios, 0),
  );
  return huella;
};

export const leerAcumuladosVenta = async (transaction, canales) => {
  const ids = [...new Set([CANAL_GENERAL_ID, ...canales.filter(Boolean)])];
  const acumulados = new Map();
  for (const id of ids) {
    const referencia = doc(db, "canalesVentas", id);
    const snapshot = await transaction.get(referencia);
    if (!snapshot.exists()) throw new Error(`No existe el canal de venta ${id}.`);
    acumulados.set(id, { referencia, datos: snapshot.data() });
  }
  return acumulados;
};

export const validarCanalSeleccionable = (acumulados, canal) => {
  if (!canal || canal === CANAL_GENERAL_ID) {
    throw new Error("Seleccioná un canal de venta válido.");
  }
  const documento = acumulados.get(canal);
  if (!documento || documento.datos.estado !== true) {
    throw new Error("El canal de venta seleccionado no está disponible.");
  }
};

const diferencia = (nuevo, anterior) => redondearMoneda(
  numeroSeguro(nuevo) - numeroSeguro(anterior),
);

const sumarAlCanal = (datos, huella, signo) => {
  const actualizado = {
    ventas: numeroSeguro(datos.ventas) + signo * numeroSeguro(huella.ventas),
    totalCostos: redondearMoneda(
      numeroSeguro(datos.totalCostos) + signo * numeroSeguro(huella.totalCostos),
    ),
    totalPrecios: redondearMoneda(
      numeroSeguro(datos.totalPrecios) + signo * numeroSeguro(huella.totalPrecios),
    ),
  };
  if (
    signo > 0 &&
    huella.ultimaVenta &&
    timestampMillis(huella.ultimaVenta) > timestampMillis(datos.ultimaVenta)
  ) {
    actualizado.ultimaVenta = huella.ultimaVenta;
  }
  return actualizado;
};

export const aplicarDiferenciaEstadistica = ({
  transaction,
  acumulados,
  huellaAnterior,
  huellaNueva,
}) => {
  const anteriorValida = huellaAnterior?.contabilizable === true;
  const nuevaValida = huellaNueva?.contabilizable === true;
  if (!anteriorValida && !nuevaValida) return;

  const canalAnterior = anteriorValida ? huellaAnterior.canal : null;
  const canalNuevo = nuevaValida ? huellaNueva.canal : null;
  if (canalAnterior && canalAnterior === canalNuevo) {
    const documento = acumulados.get(canalNuevo);
    const cambios = {
      ventas:
        numeroSeguro(documento.datos.ventas) +
        diferencia(huellaNueva.ventas, huellaAnterior.ventas),
      totalCostos:
        numeroSeguro(documento.datos.totalCostos) +
        diferencia(huellaNueva.totalCostos, huellaAnterior.totalCostos),
      totalPrecios:
        numeroSeguro(documento.datos.totalPrecios) +
        diferencia(huellaNueva.totalPrecios, huellaAnterior.totalPrecios),
    };
    if (
      huellaNueva.ultimaVenta &&
      timestampMillis(huellaNueva.ultimaVenta) > timestampMillis(documento.datos.ultimaVenta)
    ) {
      cambios.ultimaVenta = huellaNueva.ultimaVenta;
    }
    transaction.update(documento.referencia, cambios);
  } else {
    if (canalAnterior) {
      const documento = acumulados.get(canalAnterior);
      transaction.update(
        documento.referencia,
        sumarAlCanal(documento.datos, huellaAnterior, -1),
      );
    }
    if (canalNuevo) {
      const documento = acumulados.get(canalNuevo);
      transaction.update(
        documento.referencia,
        sumarAlCanal(documento.datos, huellaNueva, 1),
      );
    }
  }

  const general = acumulados.get(CANAL_GENERAL_ID);
  const meses = { ...(general.datos.meses || {}) };
  const claves = new Set([
    ...Object.keys(anteriorValida ? huellaAnterior.meses || {} : {}),
    ...Object.keys(nuevaValida ? huellaNueva.meses || {} : {}),
  ]);
  for (const mes of claves) {
    const actual = meses[mes] || { ventas: 0, totalCostos: 0, totalPrecios: 0 };
    const anterior = anteriorValida ? huellaAnterior.meses?.[mes] || {} : {};
    const nuevo = nuevaValida ? huellaNueva.meses?.[mes] || {} : {};
    meses[mes] = {
      ventas: numeroSeguro(actual.ventas) + diferencia(nuevo.ventas, anterior.ventas),
      totalCostos: redondearMoneda(
        numeroSeguro(actual.totalCostos) +
          diferencia(nuevo.totalCostos, anterior.totalCostos),
      ),
      totalPrecios: redondearMoneda(
        numeroSeguro(actual.totalPrecios) +
          diferencia(nuevo.totalPrecios, anterior.totalPrecios),
      ),
    };
  }
  transaction.update(general.referencia, { meses });
};

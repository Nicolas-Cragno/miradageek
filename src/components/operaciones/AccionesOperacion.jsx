import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { puedeGestionarOperaciones } from "../../auth/permisos";
import { useData } from "../../context/DataContext";
import {
  anularOperacion,
  registrarCumplimiento,
} from "../../functions/operaciones/operacionesService";
import { ESTADOS_OPERACION } from "../../functions/operaciones/modeloOperaciones";
import {
  showConfirmation,
  showError,
  showFulfillment,
  showReason,
  showSuccess,
} from "../../utils/alerts";
import TextButton from "../buttons/TextButton";

export default function AccionesOperacion({ operacion, coleccion }) {
  const { user } = useAuth();
  const { sucursales = [] } = useData();
  const [procesando, setProcesando] = useState(false);
  if (!puedeGestionarOperaciones(user) || !operacion) return null;
  if (operacion.estado === ESTADOS_OPERACION.ANULADA) return null;

  const nombreDetalles =
    coleccion === "compras" ? "detalleCompras" : "detalleVentas";
  const detalles = operacion[nombreDetalles] || [];
  const sucursalesDisponibles = sucursales.map((sucursal) => sucursal.id);

  const cumplir = async () => {
    const cantidades = await showFulfillment(
      coleccion === "compras" ? "Registrar recepción" : "Registrar entrega",
      detalles,
    );
    if (!cantidades) return;
    setProcesando(true);
    const ejecutar = (permitirNegativo) =>
      registrarCumplimiento({
        coleccion,
        operacion,
        cantidades,
        usuario: user.id,
        sucursalesDisponibles,
        permitirNegativo,
      });
    try {
      try {
        await ejecutar(false);
      } catch (error) {
        if (error?.code !== "stock-negativo") throw error;
        const confirmado = await showConfirmation(
          "Stock negativo",
          error.message,
          "Continuar igualmente",
        );
        if (!confirmado) return;
        await ejecutar(true);
      }
      await showSuccess("Cumplimiento registrado", "El stock quedó actualizado.");
    } catch (error) {
      await showError("No se pudo registrar", error.message);
    } finally {
      setProcesando(false);
    }
  };

  const anular = async () => {
    const tieneCumplimiento = detalles.some(
      (detalle) => Number(detalle.cantidadCumplida || 0) > 0,
    );
    const motivo = await showReason(
      "Anular operación",
      tieneCumplimiento
        ? "La operación posee cantidades cumplidas. El stock físico no cambiará automáticamente."
        : "Se liberarán las cantidades pendientes o reservadas.",
    );
    if (!motivo) return;
    let reingresarVenta = false;
    if (coleccion === "ventas" && tieneCumplimiento) {
      reingresarVenta = await showConfirmation(
        "Reingresar mercadería",
        "¿Querés reingresar al stock las unidades ya entregadas?",
        "Sí, reingresar",
      );
    }
    setProcesando(true);
    try {
      await anularOperacion({
        coleccion,
        operacion,
        motivo,
        usuario: user.id,
        reingresarVenta,
        sucursalesDisponibles,
      });
      await showSuccess("Operación anulada", "La anulación quedó registrada.");
    } catch (error) {
      await showError("No se pudo anular", error.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      {operacion.estado !== ESTADOS_OPERACION.COMPLETADA && (
        <TextButton text="Registrar cumplimiento" onClick={cumplir} />
      )}
      <TextButton text={procesando ? "Procesando..." : "Anular"} onClick={anular} />
    </>
  );
}

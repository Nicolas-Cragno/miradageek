import Swal from "sweetalert2";

const theme = {
  background: "#111827",
  color: "#f8fafc",
  confirmButtonColor: "#2563eb",
};

export function showSuccess(title, text) {
  return Swal.fire({ ...theme, icon: "success", title, text });
}

export function showError(title, text) {
  return Swal.fire({ ...theme, icon: "error", title, text });
}

export function showWarning(title, text) {
  return Swal.fire({ ...theme, icon: "warning", title, text });
}

export async function showConfirmation(
  title,
  text,
  confirmButtonText = "Confirmar",
) {
  const result = await Swal.fire({
    ...theme,
    icon: "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });

  return result.isConfirmed;
}

export function authErrorMessage(code) {
  const messages = {
    "auth/invalid-credential": "El correo o la contraseña no son correctos.",
    "auth/invalid-email": "Ingresá un correo electrónico válido.",
    "auth/user-disabled": "Esta cuenta está deshabilitada.",
    "auth/too-many-requests":
      "Hubo demasiados intentos. Esperá unos minutos y volvé a intentar.",
    "auth/network-request-failed":
      "No se pudo conectar. Revisá tu conexión a internet.",
    "auth/missing-email": "Ingresá tu correo electrónico.",
  };

  return messages[code] ?? "No se pudo iniciar sesión. Intentá nuevamente.";
}

export async function showFulfillment(title, detalles = []) {
  const contenedor = document.createElement("div");
  detalles.forEach((detalle) => {
    const restante = Math.max(
      Number(detalle.cantidad || 0) - Number(detalle.cantidadCumplida || 0),
      0,
    );
    const grupo = document.createElement("label");
    grupo.style.display = "grid";
    grupo.style.gap = "6px";
    grupo.style.marginBottom = "12px";
    const texto = document.createElement("span");
    texto.textContent = `${detalle.descripcion || detalle.labelProducto || detalle.idProducto} — restante ${restante}`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(restante);
    input.step = "1";
    input.value = "0";
    input.dataset.detalleId = detalle.id;
    grupo.append(texto, input);
    contenedor.append(grupo);
  });

  const resultado = await Swal.fire({
    ...theme,
    title,
    html: contenedor,
    showCancelButton: true,
    confirmButtonText: "Registrar",
    cancelButtonText: "Cancelar",
    preConfirm: () => {
      const cantidades = {};
      contenedor.querySelectorAll("input").forEach((input) => {
        cantidades[input.dataset.detalleId] = Number(input.value);
      });
      return cantidades;
    },
  });

  return resultado.isConfirmed ? resultado.value : null;
}

export async function showReason(title, text) {
  const resultado = await Swal.fire({
    ...theme,
    icon: "warning",
    title,
    text,
    input: "textarea",
    inputLabel: "Motivo obligatorio",
    inputValidator: (valor) =>
      valor?.trim() ? undefined : "Ingresá el motivo de la anulación.",
    showCancelButton: true,
    confirmButtonText: "Anular operación",
    cancelButtonText: "Cancelar",
  });

  return resultado.isConfirmed ? resultado.value.trim() : null;
}

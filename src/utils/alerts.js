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
  };

  return messages[code] ?? "No se pudo iniciar sesión. Intentá nuevamente.";
}

import { createContext, useContext, useEffect, useState } from "react";
import { login, logout, recuperarPassword, subscribeAuth } from "./authService";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { showError, showWarning } from "../utils/alerts";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelarAcceso = null;
    let cancelarUsuario = null;

    const limpiarListeners = () => {
      cancelarAcceso?.();
      cancelarUsuario?.();
      cancelarAcceso = null;
      cancelarUsuario = null;
    };

    const unsub = subscribeAuth(async (firebaseUser) => {
      limpiarListeners();
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const rechazarAcceso = async (mensaje) => {
        limpiarListeners();
        setUser(null);
        setLoading(false);
        await logout();
        await showWarning("Acceso no habilitado", mensaje);
      };

      cancelarAcceso = onSnapshot(
        doc(db, "accesosUsuarios", firebaseUser.uid),
        (accesoSnapshot) => {
          const acceso = accesoSnapshot.exists() ? accesoSnapshot.data() : null;

          if (!acceso || acceso.estado !== true || !acceso.usuarioId) {
            void rechazarAcceso(
              "Tu cuenta no está autorizada para ingresar a Mirada Geek.",
            );
            return;
          }

          cancelarUsuario?.();
          cancelarUsuario = onSnapshot(
            doc(db, "usuarios", acceso.usuarioId),
            (usuarioSnapshot) => {
              const usuario = usuarioSnapshot.exists()
                ? { ...usuarioSnapshot.data(), id: usuarioSnapshot.id }
                : null;

              if (!usuario || usuario.uid !== firebaseUser.uid) {
                void rechazarAcceso(
                  "No encontramos un usuario interno válido para tu cuenta.",
                );
                return;
              }

              setUser({
                ...firebaseUser,
                ...usuario,
                tipo: acceso.tipo,
                estado: acceso.estado,
                entidadTipo: acceso.entidadTipo ?? "",
                entidadId: acceso.entidadId ?? "",
              });
              setLoading(false);
            },
            () => {
              void rechazarAcceso("No pudimos validar tu usuario interno.");
            },
          );
        },
        async () => {
          limpiarListeners();
          await logout();
          setUser(null);
          setLoading(false);
          await showError(
            "No pudimos validar tu cuenta",
            "Revisá tu conexión o intentá nuevamente en unos minutos.",
          );
        },
      );
    });

    return () => {
      limpiarListeners();
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, recuperarPassword, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

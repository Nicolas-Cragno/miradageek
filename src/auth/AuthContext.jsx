import { createContext, useContext, useEffect, useState } from "react";
import { login, logout, subscribeAuth } from "./authService";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { showError, showWarning } from "../utils/alerts";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAuth(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const userQuery = query(
          collection(db, "usuarios"),
          where("uid", "==", firebaseUser.uid),
          limit(1),
        );
        const snapshot = await getDocs(userQuery);
        const userDocument = snapshot.docs[0];
        const registeredUser = userDocument
          ? { id: userDocument.id, ...userDocument.data() }
          : null;

        if (!registeredUser || registeredUser.estado !== true) {
          await logout();
          setUser(null);
          await showWarning(
            "Acceso no habilitado",
            "Tu cuenta no está autorizada para ingresar a Mirada Geek.",
          );
          return;
        }

        setUser({ ...firebaseUser, ...registeredUser });
      } catch {
        await logout();
        setUser(null);
        await showError(
          "No pudimos validar tu cuenta",
          "Revisá tu conexión o intentá nuevamente en unos minutos.",
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

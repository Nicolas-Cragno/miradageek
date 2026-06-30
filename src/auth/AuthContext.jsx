import { createContext, useContext, useEffect, useState } from "react";
import { login, logout, subscribeAuth } from "./authService";
import { useData } from "../context/DataContext";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { usuarios } = useData();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAuth((firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const registrado = usuarios?.find((u) => u.uid === firebaseUser.uid);

      if (!registrado || !registrado.estado) {
        logout();
        setUser(null);
      } else {
        setUser({
          ...firebaseUser,
          ...registrado,
        });
      }

      setLoading(false);
    });

    return () => unsub();
  }, [usuarios]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

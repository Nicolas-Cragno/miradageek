import { createContext, useContext, useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { login, logout, subscribeAuth } from "./authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { usuarios = [], usuariosLoaded } = useData();
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    const unsub = subscribeAuth((nextFirebaseUser) => {
      setFirebaseUser(nextFirebaseUser);
      setAuthResolved(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authResolved) return;

    if (!firebaseUser) {
      setUser(null);
      return;
    }

    if (!usuariosLoaded) return;

    const registrado = usuarios.find((item) => item.uid === firebaseUser.uid);

    if (!registrado || !registrado.estado) {
      logout();
      setUser(null);
      return;
    }

    setUser({ ...firebaseUser, ...registrado });
  }, [authResolved, firebaseUser, usuarios, usuariosLoaded]);

  const loading = !authResolved || (Boolean(firebaseUser) && !usuariosLoaded);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

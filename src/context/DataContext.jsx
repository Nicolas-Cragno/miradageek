import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

const DataContext = createContext();

const colecciones = [
  "usuarios",
  "roles",
  "sucursales",
  "clientes",
  "contadores",
  "productos",
  "proveedores",
  "tipos",
];

export function DataProvider({ children }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [];
    const cargadas = new Set();

    console.log("[Datos] Iniciando carga...");

    colecciones.forEach((nombreColeccion) => {
      const ref = collection(db, nombreColeccion);

      const unsub = onSnapshot(ref, (snapshot) => {
        setData((prev) => ({
          ...prev,
          [nombreColeccion]: snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        }));

        cargadas.add(nombreColeccion);

        console.log(
          `→ ${nombreColeccion} ✓ (${snapshot.docs.length} registros)`,
        );

        if (cargadas.size === colecciones.length) {
          setLoading(false);
          console.log("[Datos] Carga finalizada ✓");
        }
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach((fn) => fn());
  }, []);

  return (
    <DataContext.Provider value={{ ...data, loading }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);

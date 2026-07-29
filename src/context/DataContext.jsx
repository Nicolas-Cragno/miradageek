import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const DataContext = createContext();

const colecciones = [
  "usuarios",
  "roles",
  "sucursales",
  "clientes",
  "productos",
  "proveedores",
  "tipos",
  "compras",
  "detalleCompras",
  "ventas",
  "detalleVentas",
];

export function DataProvider({ children }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargadas = new Set();
    const marcarComoCargada = (nombreColeccion) => {
      cargadas.add(nombreColeccion);

      if (cargadas.size === colecciones.length) {
        setLoading(false);
      }
    };

    const unsubs = colecciones.map((nombreColeccion) =>
      onSnapshot(
        collection(db, nombreColeccion),
        (snapshot) => {
          setData((prev) => ({
            ...prev,
            [nombreColeccion]: snapshot.docs.map((documento) => ({
              id: documento.id,
              ...documento.data(),
            })),
          }));
          marcarComoCargada(nombreColeccion);
        },
        (snapshotError) => {
          console.error(
            `[Datos] Error cargando ${nombreColeccion}:`,
            snapshotError,
          );
          setError(
            "No se pudieron cargar todos los datos. Revisá tu conexión o permisos.",
          );
          marcarComoCargada(nombreColeccion);
        },
      ),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  return (
    <DataContext.Provider
      value={{
        ...data,
        loading,
        error,
        usuariosLoaded: Object.hasOwn(data, "usuarios"),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { showError } from "../utils/alerts";

const DataContext = createContext();

export function DataProvider({ children, collections: requestedCollections = [] }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const errorShown = useRef(false);

  useEffect(() => {
    const collections = requestedCollections.filter(
      (item, index, items) =>
        items.findIndex((candidate) =>
          typeof item === "string"
            ? candidate === item
            : candidate.nombre === item.nombre,
        ) === index,
    );
    setData({});
    setError("");
    errorShown.current = false;
    setLoading(collections.length > 0);

    if (collections.length === 0) return undefined;

    const cargadas = new Set();
    const marcarComoCargada = (nombreColeccion) => {
      cargadas.add(nombreColeccion);

      if (cargadas.size === collections.length) {
        setLoading(false);
      }
    };

    const unsubs = collections.map((configuracion) => {
      const nombreColeccion =
        typeof configuracion === "string" ? configuracion : configuracion.nombre;
      const referencia = collection(db, nombreColeccion);
      const consulta =
        typeof configuracion === "string" || !configuracion.filtro
          ? referencia
          : query(
              referencia,
              where(
                configuracion.filtro.campo,
                "==",
                configuracion.filtro.valor,
              ),
            );

      return (
      onSnapshot(
        consulta,
        (snapshot) => {
          setData((prev) => ({
            ...prev,
            [nombreColeccion]: snapshot.docs.map((documento) => ({
              ...documento.data(),
              id: documento.id,
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
          if (!errorShown.current) {
            errorShown.current = true;
            void showError(
              "No pudimos cargar los datos",
              "Revisá tu conexión o volvé a iniciar sesión. Si continúa, contactá al administrador.",
            );
          }
          marcarComoCargada(nombreColeccion);
        },
      )
      );
    });

    return () => unsubs.forEach((unsub) => unsub());
  }, [requestedCollections]);

  return (
    <DataContext.Provider
      value={{
        ...data,
        loading,
        error,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  documentId,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { showError } from "../utils/alerts";

const DataContext = createContext();

export function DataProvider({ children, collections: requestedCollections = [] }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState({});
  const errorShown = useRef(false);

  useEffect(() => {
    const claveDatos = (configuracion) =>
      typeof configuracion === "string"
        ? configuracion
        : configuracion.clave || configuracion.nombre;
    const collections = requestedCollections.filter(
      (item, index, items) =>
        items.findIndex((candidate) => claveDatos(candidate) === claveDatos(item)) === index,
    );
    setData({});
    setError("");
    setErrores({});
    errorShown.current = false;
    setLoading(collections.length > 0);

    if (collections.length === 0) return undefined;

    const cargadas = new Set();
    const marcarComoCargada = (clave) => {
      cargadas.add(clave);

      if (cargadas.size === collections.length) {
        setLoading(false);
      }
    };

    const unsubs = collections.map((configuracion) => {
      const nombreColeccion =
        typeof configuracion === "string" ? configuracion : configuracion.nombre;
      const clave = claveDatos(configuracion);
      const esDocumento =
        typeof configuracion !== "string" && Boolean(configuracion.documento);
      const referencia = esDocumento
        ? doc(db, nombreColeccion, configuracion.documento)
        : collection(db, nombreColeccion);
      const filtros = typeof configuracion === "string"
        ? []
        : configuracion.filtros || (configuracion.filtro ? [configuracion.filtro] : []);
      const consulta = !esDocumento && filtros.length
        ? query(
            referencia,
            ...filtros.map((filtro) =>
              where(
                filtro.campo === "__name__" ? documentId() : filtro.campo,
                filtro.operador || "==",
                filtro.valor,
              ),
            ),
          )
        : referencia;

      return (
      onSnapshot(
        consulta,
        (snapshot) => {
          setData((prev) => ({
            ...prev,
            [clave]: esDocumento
              ? snapshot.exists()
                ? { ...snapshot.data(), id: snapshot.id }
                : null
              : snapshot.docs.map((documento) => ({
                  ...documento.data(),
                  id: documento.id,
                })),
          }));
          marcarComoCargada(clave);
        },
        (snapshotError) => {
          console.error(
            `[Datos] Error cargando ${clave}:`,
            snapshotError,
          );
          setError(
            "No se pudieron cargar todos los datos. Revisá tu conexión o permisos.",
          );
          setErrores((prev) => ({ ...prev, [clave]: snapshotError.code || "unknown" }));
          if (!errorShown.current) {
            errorShown.current = true;
            void showError(
              "No pudimos cargar los datos",
              "Revisá tu conexión o volvé a iniciar sesión. Si continúa, contactá al administrador.",
            );
          }
          marcarComoCargada(clave);
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
        errores,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);

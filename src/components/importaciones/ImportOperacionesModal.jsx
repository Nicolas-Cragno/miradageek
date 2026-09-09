import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../../context/DataContext";
import {
  canalesImportables,
  formatearFechaImportacion,
  leerExcel,
  normalizarFilasExcel,
  resolverFechaImportacion,
  validarFilaImportacion,
} from "../../functions/importaciones/importarOperacionesExcel";
import "./ImportOperacionesModal.css";

export default function ImportOperacionesModal({ open, collection, onClose }) {
  if (!open) return null;
  // El contenido se desmonta al cerrar: ningún preview sobrevive a otra apertura.
  return <ContenidoImportacion key={collection} collection={collection} onClose={onClose} />;
}

function ContenidoImportacion({ collection, onClose }) {
  const data = useData();
  const [archivo, setArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [filas, setFilas] = useState([]);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const lectura = useRef(0);
  const dialogo = useRef(null);
  const cerrar = useRef(null);
  const esVenta = collection === "ventas";
  const coleccionValida = ["compras", "ventas"].includes(collection);
  const canales = canalesImportables(data);
  const preview = useMemo(() => coleccionValida
    ? filas.map((fila) => validarFilaImportacion(fila, collection, data))
    : [], [filas, collection, data, coleccionValida]);
  const listas = preview.filter((fila) => fila.errores.length === 0).length;
  const error = !coleccionValida ? "Solo se pueden importar compras o ventas." : errorGeneral;

  useEffect(() => {
    const focoAnterior = document.activeElement;
    cerrar.current?.focus();
    return () => {
      lectura.current += 1;
      focoAnterior?.focus();
    };
  }, []);

  async function cargarArchivo(file) {
    if (!coleccionValida || data.loading) return;
    const solicitud = ++lectura.current;
    setArchivo(file || null);
    setFilas([]);
    setErrorGeneral("");
    setProcesando(true);
    try {
      const resultado = await leerExcel(file, collection);
      if (solicitud !== lectura.current) return;
      setFilas(normalizarFilasExcel(resultado.filas, collection, data, { date1904: resultado.date1904 }));
    } catch (errorLectura) {
      if (solicitud === lectura.current) {
        setErrorGeneral(errorLectura instanceof Error ? errorLectura.message : "No se pudo leer el archivo.");
      }
    } finally {
      if (solicitud === lectura.current) setProcesando(false);
    }
  }

  function editar(filaExcel, cambios) {
    setFilas((anteriores) => anteriores.map((fila) => fila.filaExcel === filaExcel
      ? validarFilaImportacion({ ...fila, ...cambios }, collection, data)
      : fila));
  }

  function numero(fila, campo, etiqueta) {
    return <input
      className="import-operaciones-numero"
      type="number"
      min={campo === "cantidad" ? "0.000001" : "0"}
      step="any"
      aria-label={etiqueta + ", fila " + fila.filaExcel}
      value={Number.isFinite(fila[campo]) ? fila[campo] : ""}
      title={fila[campo + "Original"] ? "Excel: " + fila[campo + "Original"] : undefined}
      onChange={(event) => editar(fila.filaExcel, {
        [campo]: event.target.value === "" ? Number.NaN : Number(event.target.value),
      })}
    />;
  }

  function relacion(fila, campo, opciones, etiqueta, original = "") {
    const existe = opciones.some((item) => item.id === fila[campo]);
    return <>
      <select
        aria-label={etiqueta + ", fila " + fila.filaExcel}
        value={existe ? fila[campo] : ""}
        onChange={(event) => editar(fila.filaExcel, { [campo]: event.target.value })}
      >
        <option value="">Seleccionar…</option>
        {opciones.map((item) => <option key={item.id} value={item.id}>
          {(item.descripcion || item.nombre || item.id) + " | " + item.id}
        </option>)}
      </select>
      {original && <small className="import-operaciones-original">Excel: {original}</small>}
    </>;
  }

  function teclado(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
    if (event.key !== "Tab") return;
    const controles = [...dialogo.current.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled)")];
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo?.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero?.focus();
    }
  }

  return <div className="import-operaciones-overlay">
    <div className="import-operaciones-modal" role="dialog" aria-modal="true"
      aria-labelledby="import-operaciones-titulo" ref={dialogo} onKeyDown={teclado}>
      <div className="import-operaciones-header">
        <div>
          <h2 id="import-operaciones-titulo">Importar datos{coleccionValida ? " · " + (esVenta ? "Ventas" : "Compras") : ""}</h2>
          <p>Revisá y corregí las filas del Excel. Cada fila corresponde a una operación.</p>
        </div>
        <button type="button" ref={cerrar} onClick={onClose} aria-label="Cerrar importación">✕</button>
      </div>

      <div className="import-operaciones-contenido">
        <div
          className={"import-operaciones-archivo" + (arrastrando ? " import-operaciones-arrastrando" : "")}
          onDragOver={(event) => { event.preventDefault(); setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(event) => {
            event.preventDefault();
            setArrastrando(false);
            if (data.loading || !coleccionValida) return;
            if (event.dataTransfer.files.length !== 1) {
              lectura.current += 1;
              setFilas([]);
              setArchivo(null);
              setProcesando(false);
              setErrorGeneral("Seleccioná un solo archivo Excel.");
              return;
            }
            void cargarArchivo(event.dataTransfer.files[0]);
          }}
        >
          <label htmlFor="import-operaciones-archivo">Seleccioná o arrastrá un Excel (.xls o .xlsx)</label>
          <input id="import-operaciones-archivo" type="file" accept=".xls,.xlsx"
            disabled={!coleccionValida || data.loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void cargarArchivo(file);
            }}
          />
          <small>Se lee únicamente la primera hoja. Un nuevo archivo reemplaza la grilla.</small>
          {archivo && <strong>{archivo.name}</strong>}
        </div>

        {(procesando || data.loading) && <p role="status">
          {procesando ? "Leyendo Excel…" : "Cargando datos disponibles…"}
        </p>}
        {error && <p className="import-operaciones-error" role="alert">{error}</p>}
        {Object.keys(data.errores || {}).length > 0 && <p className="import-operaciones-error" role="alert">
          No se pudieron cargar todos los catálogos. Las relaciones faltantes quedarán para revisar.
        </p>}

        {preview.length > 0 && <>
          <p className="import-operaciones-resumen" role="status">
            {preview.length} filas · {listas} listas · {preview.length - listas} para revisar
          </p>
          <div className="import-operaciones-grilla">
            <table>
              <thead><tr>
                <th>Fila</th><th>Producto Excel</th><th>Producto sistema</th>
                <th>Cantidad</th>{esVenta && <th>Venta</th>}<th>Costo</th>
                <th>Moneda</th><th>Fecha</th>{esVenta && <th>Canal</th>}
                <th>{esVenta ? "Cliente" : "Proveedor"}</th><th>Sucursal</th>
                <th>Estado</th><th>Eliminar</th>
              </tr></thead>
              <tbody>{preview.map((fila) => <tr key={fila.filaExcel}
                className={fila.errores.length ? "import-operaciones-revisar" : ""}>
                <td>{fila.filaExcel}</td>
                <td className="import-operaciones-producto-original">{fila.productoOriginal || "—"}</td>
                <td>{relacion(fila, "productoId", data.productos || [], "Producto")}</td>
                <td>{numero(fila, "cantidad", "Cantidad")}</td>
                {esVenta && <td>{numero(fila, "precio", "Venta")}</td>}
                <td>{numero(fila, "costo", "Costo")}</td>
                <td><select aria-label={"Moneda, fila " + fila.filaExcel} value={fila.moneda}
                  onChange={(event) => editar(fila.filaExcel, { moneda: event.target.value })}>
                  {!["ARS", "USD"].includes(fila.moneda) && <option value={fila.moneda}>{fila.moneda || "Seleccionar…"}</option>}
                  <option value="ARS">ARS</option><option value="USD">USD</option>
                </select></td>
                <td><input className="import-operaciones-fecha" type="text" placeholder="dd/mm/yyyy"
                  aria-label={"Fecha, fila " + fila.filaExcel}
                  value={fila.fechaTexto}
                  onChange={(event) => editar(fila.filaExcel, {
                    fechaTexto: event.target.value,
                    fecha: resolverFechaImportacion(event.target.value),
                  })}
                  onBlur={() => {
                    if (fila.fecha) editar(fila.filaExcel, { fechaTexto: formatearFechaImportacion(fila.fecha) });
                  }}
                /></td>
                {esVenta && <td>{relacion(fila, "canalId", canales, "Canal", fila.canalOriginal)}</td>}
                <td>{esVenta
                  ? relacion(fila, "clienteId", data.clientes || [], "Cliente", fila.clienteOriginal)
                  : relacion(fila, "proveedorId", data.proveedores || [], "Proveedor", fila.proveedorOriginal)}</td>
                <td>{relacion(fila, "sucursalId", data.sucursales || [], "Sucursal", fila.sucursalOriginal)}</td>
                <td className="import-operaciones-estado">
                  <strong className={fila.errores.length ? "import-operaciones-pendiente" : "import-operaciones-lista"}>
                    {fila.errores.length ? "Revisar" : "Lista"}
                  </strong>
                  {fila.errores.length > 0 && <ul>{fila.errores.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul>}
                  {fila.advertencias.map((mensaje) => <p className="import-operaciones-advertencia" key={mensaje}>{mensaje}</p>)}
                </td>
                <td><button type="button" aria-label={"Eliminar fila " + fila.filaExcel}
                  onClick={() => setFilas((anteriores) => anteriores.filter((item) => item.filaExcel !== fila.filaExcel))}>
                  Eliminar
                </button></td>
              </tr>)}</tbody>
            </table>
          </div>
        </>}
        {!procesando && archivo && !error && filas.length === 0 && <p>No hay filas para revisar.</p>}
      </div>
      <div className="import-operaciones-footer">
        <span>El guardado se implementará en la siguiente etapa.</span>
        <button type="button" onClick={onClose}>Cerrar</button>
        <button type="button" disabled title="El guardado se implementará en la siguiente etapa.">Importar</button>
      </div>
    </div>
  </div>;
}

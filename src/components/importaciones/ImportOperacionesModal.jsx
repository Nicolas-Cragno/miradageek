import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../auth/AuthContext";
import Swal from "sweetalert2";
import { guardarOperacion } from "../../functions/submits/abmFunctions";
import { obtenerVentaDolarOficial } from "../../services/dolarService";
import {
  canalesImportables,
  construirOperacionImportada,
  obtenerMensajeErrorImportacion,
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
  const { user } = useAuth();
  const [archivo, setArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [filas, setFilas] = useState([]);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultadosImportacion, setResultadosImportacion] = useState([]);
  const [finalizada, setFinalizada] = useState(false);
  const [progreso, setProgreso] = useState("");
  const importacionEnCurso = useRef(false);
  const importacionFinalizada = useRef(false);
  const contextoActual = useRef({ data, usuario: user?.id });
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


  const bloqueado = importando || finalizada;
  const puedeImportar = coleccionValida && preview.length > 0 &&
    listas === preview.length && !procesando && !data.loading && !bloqueado;
  const correctas = resultadosImportacion.filter((resultado) => resultado.ok).length;

  // Los listeners pueden actualizar catálogos durante la confirmación/cotización.
  useEffect(() => {
    contextoActual.current = { data, usuario: user?.id };
  }, [data, user?.id]);

  function cerrarModal() {
    if (!importacionEnCurso.current) onClose();
  }

  async function importar() {
    // El ref bloquea incluso un segundo click antes del próximo render.
    if (importacionEnCurso.current || importacionFinalizada.current || !puedeImportar) return;
    const usuario = user?.id;
    if (typeof usuario !== "string" || !/^US-[A-Z][0-9]{4}$/.test(usuario)) {
      setErrorGeneral("No pudimos identificar tu usuario interno. Cerrá sesión y volvé a ingresar.");
      return;
    }
    const filasAImportar = preview.map((fila) => ({ ...fila }));
    if (filasAImportar.some((fila) => fila.errores.length > 0)) return;
    importacionEnCurso.current = true;
    setImportando(true);
    setErrorGeneral("");
    setProgreso("Esperando confirmación…");
    try {
      const confirmacion = await Swal.fire({
        title: "Confirmar importación",
        text: "Se crearán " + filasAImportar.length + " " + collection +
          " completadas. Cada fila será una operación independiente.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
        background: "#111827",
        color: "#f8fafc",
        confirmButtonColor: "#2563eb",
        customClass: { container: "import-operaciones-confirmacion" },
      });
      if (!confirmacion.isConfirmed) return;
      setProgreso("Obteniendo cotización oficial…");
      let valorDolar;
      try {
        valorDolar = await obtenerVentaDolarOficial();
      } catch {
        throw new Error("No se pudo obtener la cotización oficial del dólar. No se inició la importación.");
      }
      if (!Number.isFinite(valorDolar) || valorDolar <= 0) {
        throw new Error("La cotización oficial del dólar no es válida. No se inició la importación.");
      }
      const actual = contextoActual.current;
      if (actual.usuario !== usuario) {
        throw new Error("El usuario cambió durante la preparación. No se inició la importación.");
      }
      if (actual.data.loading || filasAImportar.some((fila) =>
        validarFilaImportacion(fila, collection, actual.data).errores.length > 0)) {
        throw new Error("Corregí o eliminá todas las filas marcadas para revisar antes de importar.");
      }
      const sucursalesDisponibles = (actual.data.sucursales || []).map((sucursal) => sucursal.id);
      // Preparar todos los payloads primero evita escrituras si la cotización USD es inválida.
      const operaciones = filasAImportar.map((fila) => ({
        fila,
        payload: construirOperacionImportada({ fila, collection, usuario, valorDolar, sucursalesDisponibles }),
      }));
      const resultados = [];
      for (const { fila, payload } of operaciones) {
        setProgreso("Procesando " + (resultados.length + 1) + " de " + operaciones.length + "…");
        try {
          const id = await guardarOperacion(payload);
          resultados.push({ filaExcel: fila.filaExcel, productoOriginal: fila.productoOriginal, ok: true, id });
        } catch (errorFila) {
          resultados.push({
            filaExcel: fila.filaExcel,
            productoOriginal: fila.productoOriginal,
            ok: false,
            error: obtenerMensajeErrorImportacion(errorFila),
          });
        }
        setResultadosImportacion([...resultados]);
      }
      importacionFinalizada.current = true;
      setFinalizada(true);
    } catch (errorImportacion) {
      setErrorGeneral(obtenerMensajeErrorImportacion(errorImportacion));
    } finally {
      importacionEnCurso.current = false;
      setImportando(false);
      setProgreso("");
    }
  }

  async function cargarArchivo(file) {
    if (!coleccionValida || data.loading || importacionEnCurso.current || importacionFinalizada.current) return;
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
    if (importacionEnCurso.current || importacionFinalizada.current) return;
    setFilas((anteriores) => anteriores.map((fila) => fila.filaExcel === filaExcel
      ? validarFilaImportacion({ ...fila, ...cambios }, collection, data)
      : fila));
  }

  function numero(fila, campo, etiqueta) {
    return <input
      className="import-operaciones-numero"
      type="number"
      disabled={bloqueado}
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
        disabled={bloqueado}
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
      cerrarModal();
    }
    if (event.key !== "Tab") return;
    const controles = [...dialogo.current.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled)")];
    if (!controles.length) {
      event.preventDefault();
      dialogo.current.focus();
      return;
    }
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
      aria-labelledby="import-operaciones-titulo" ref={dialogo} tabIndex={-1} onKeyDown={teclado}>
      <div className="import-operaciones-header">
        <div>
          <h2 id="import-operaciones-titulo">Importar datos{coleccionValida ? " · " + (esVenta ? "Ventas" : "Compras") : ""}</h2>
          <p>Revisá y corregí las filas del Excel. Cada fila corresponde a una operación.</p>
        </div>
        <button type="button" ref={cerrar} disabled={importando} onClick={cerrarModal} aria-label="Cerrar importación">✕</button>
      </div>

      <div className="import-operaciones-contenido">
        <div
          className={"import-operaciones-archivo" + (arrastrando ? " import-operaciones-arrastrando" : "")}
          onDragOver={(event) => { event.preventDefault(); if (!bloqueado) setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(event) => {
            event.preventDefault();
            setArrastrando(false);
            if (data.loading || !coleccionValida || importacionEnCurso.current || importacionFinalizada.current) return;
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
            disabled={!coleccionValida || data.loading || bloqueado}
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


        {importando && <p className="import-operaciones-progreso" role="status">{progreso}</p>}
        {finalizada && <section className="import-operaciones-resultado" aria-labelledby="import-operaciones-finalizada">
          <h3 id="import-operaciones-finalizada">Importación finalizada</h3>
          <p role="status">
            Total procesadas: {resultadosImportacion.length} · Correctas: {correctas} · Con error: {resultadosImportacion.length - correctas}
          </p>
          {resultadosImportacion.some((resultado) => !resultado.ok) && <ul className="import-operaciones-errores">
            {resultadosImportacion.filter((resultado) => !resultado.ok).map((resultado) => <li key={resultado.filaExcel}>
              <strong>Fila {resultado.filaExcel} — {resultado.productoOriginal || "Sin descripción"}</strong>
              <p>{resultado.error}</p>
            </li>)}
          </ul>}
          <p>Las filas correctas ya fueron creadas. Para corregir errores, prepará una nueva importación únicamente con las filas fallidas.</p>
        </section>}

        {!finalizada && preview.length > 0 && <>
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
                <td><select disabled={bloqueado} aria-label={"Moneda, fila " + fila.filaExcel} value={fila.moneda}
                  onChange={(event) => editar(fila.filaExcel, { moneda: event.target.value })}>
                  {!["ARS", "USD"].includes(fila.moneda) && <option value={fila.moneda}>{fila.moneda || "Seleccionar…"}</option>}
                  <option value="ARS">ARS</option><option value="USD">USD</option>
                </select></td>
                <td><input disabled={bloqueado} className="import-operaciones-fecha" type="text" placeholder="dd/mm/yyyy"
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
                <td><button type="button" disabled={bloqueado} aria-label={"Eliminar fila " + fila.filaExcel}
                  onClick={() => {
                    if (importacionEnCurso.current || importacionFinalizada.current) return;
                    setFilas((anteriores) => anteriores.filter((item) => item.filaExcel !== fila.filaExcel));
                  }}>
                  Eliminar
                </button></td>
              </tr>)}</tbody>
            </table>
          </div>
        </>}
        {!procesando && archivo && !error && filas.length === 0 && <p>No hay filas para revisar.</p>}
      </div>
      <div className="import-operaciones-footer">
        <span>{finalizada ? "Esta importación ya finalizó." : importando ? progreso :
          preview.length > 0 && listas !== preview.length
            ? "Corregí o eliminá todas las filas marcadas para revisar antes de importar."
            : "Se creará una operación completada por cada fila."}</span>
        <button type="button" disabled={importando} onClick={cerrarModal}>Cerrar</button>
        <button type="button" disabled={!puedeImportar} onClick={importar}
          title={finalizada ? "Esta importación ya fue procesada." : undefined}>Importar</button>
      </div>
    </div>
  </div>;
}

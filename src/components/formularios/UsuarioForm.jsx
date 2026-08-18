import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../context/DataContext";
import { esDesarrollador, ROLES } from "../../auth/permisos";
import { guardarUsuarioAdministrado } from "../../services/usuariosService";
import { showError, showSuccess } from "../../utils/alerts";
import SearchableSelect from "../inputs/SearchableSelect";
import Loading from "../../routes/Loading";
import "./css/Form.css";

const nombresRoles = {
  "01": "USUARIO",
  "02": "GESTOR",
  "03": "ADMINISTRADOR",
  "04": "DESARROLLADOR",
};

const datosIniciales = {
  uid: "",
  nombre: "",
  mail: "",
  tipo: "01",
  estado: true,
  entidadTipo: "cliente",
  entidadId: "",
};

export default function UsuarioForm({ open, item, onClose, onSave }) {
  const { user } = useAuth();
  const { clientes = [], proveedores = [] } = useData();
  const [datos, setDatos] = useState(datosIniciales);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDatos(
      item
        ? {
            uid: item.uid ?? "",
            nombre: item.nombre ?? "",
            mail: item.mail ?? "",
            tipo: item.tipo ?? "01",
            estado: item.estado === true,
            entidadTipo: item.entidadTipo || "cliente",
            entidadId: item.entidadId || "",
          }
        : datosIniciales,
    );
  }, [item, open]);

  const opcionesRoles = useMemo(
    () =>
      Object.entries(nombresRoles).filter(
        ([tipo]) => tipo !== ROLES.DESARROLLADOR || esDesarrollador(user),
      ),
    [user],
  );
  const entidades = datos.entidadTipo === "cliente" ? clientes : proveedores;

  if (!open) return null;

  const cambiar = (campo, valor) =>
    setDatos((actual) => ({ ...actual, [campo]: valor }));

  const guardar = async (event) => {
    event.preventDefault();

    if (!datos.nombre.trim() || !datos.mail.trim() || !datos.uid.trim()) {
      await showError("Datos incompletos", "UID, nombre y correo son obligatorios.");
      return;
    }
    if (datos.tipo === ROLES.USUARIO && !datos.entidadId) {
      await showError(
        "Relación obligatoria",
        "Seleccioná el cliente o proveedor relacionado.",
      );
      return;
    }
    if (
      !esDesarrollador(user) &&
      (datos.tipo === ROLES.DESARROLLADOR || item?.tipo === ROLES.DESARROLLADOR)
    ) {
      await showError(
        "Acción no permitida",
        "Sólo un desarrollador puede administrar accesos de desarrollador.",
      );
      return;
    }

    setGuardando(true);
    try {
      await guardarUsuarioAdministrado(datos, item);
      await showSuccess(
        item ? "Usuario actualizado" : "Usuario registrado",
        item
          ? "Los datos y permisos quedaron sincronizados."
          : "Se creó el usuario interno. La credencial debe existir previamente en Firebase Authentication.",
      );
      onSave?.();
      onClose?.();
    } catch (error) {
      await showError(
        "No se pudo guardar el usuario",
        error instanceof Error ? error.message : "Intentá nuevamente.",
      );
    } finally {
      setGuardando(false);
    }
  };

  if (guardando) return <Loading />;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-form" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
          <h2>{item ? "Editar usuario" : "Nuevo usuario interno"}</h2>
          <div className="modal-spacer" />
        </div>
        <form onSubmit={guardar}>
          <div className="form-grid">
            <div className="form-group">
              <label>UID de Firebase Authentication</label>
              <input
                value={datos.uid}
                disabled={Boolean(item)}
                onChange={(event) => cambiar("uid", event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Nombre</label>
              <input
                value={datos.nombre}
                onChange={(event) => cambiar("nombre", event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input
                type="email"
                value={datos.mail}
                onChange={(event) => cambiar("mail", event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <select
                value={datos.tipo}
                onChange={(event) => cambiar("tipo", event.target.value)}
              >
                {opcionesRoles.map(([tipo, nombre]) => (
                  <option key={tipo} value={tipo}>{tipo} — {nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select
                value={String(datos.estado)}
                onChange={(event) => cambiar("estado", event.target.value === "true")}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
            {datos.tipo === ROLES.USUARIO && (
              <>
                <div className="form-group">
                  <label>Tipo de entidad</label>
                  <select
                    value={datos.entidadTipo}
                    onChange={(event) =>
                      setDatos((actual) => ({
                        ...actual,
                        entidadTipo: event.target.value,
                        entidadId: "",
                      }))
                    }
                  >
                    <option value="cliente">Cliente</option>
                    <option value="proveedor">Proveedor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Entidad relacionada</label>
                  <SearchableSelect
                    options={entidades}
                    value={datos.entidadId}
                    onChange={(valor) => cambiar("entidadId", valor)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="form-buttons">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {item ? "Guardar" : "Crear documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

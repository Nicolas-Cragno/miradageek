import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../context/DataContext";
import {
  ENTIDADES_USUARIO,
  esDesarrollador,
  ROLES,
  TIPOS_ENTIDAD_USUARIO,
} from "../../auth/permisos";
import {
  crearUsuarioAdministrado,
  guardarUsuarioAdministrado,
} from "../../services/usuariosService";
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
  entidadTipo: null,
  entidadId: null,
  password: "",
  confirmarPassword: "",
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
            entidadTipo:
              item.tipo === ROLES.USUARIO ? (item.entidadTipo ?? null) : null,
            entidadId:
              item.tipo === ROLES.USUARIO ? (item.entidadId ?? null) : null,
            password: "",
            confirmarPassword: "",
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
  const entidades =
    datos.entidadTipo === ENTIDADES_USUARIO.CLIENTE
      ? clientes
      : datos.entidadTipo === ENTIDADES_USUARIO.PROVEEDOR
        ? proveedores
        : [];

  if (!open) return null;

  const cambiar = (campo, valor) =>
    setDatos((actual) => ({ ...actual, [campo]: valor }));

  const cambiarRol = (tipo) =>
    setDatos((actual) => ({
      ...actual,
      tipo,
      entidadTipo: null,
      entidadId: null,
    }));

  const guardar = async (event) => {
    event.preventDefault();

    if (!datos.nombre.trim() || !datos.mail.trim()) {
      await showError("Datos incompletos", "Nombre y correo son obligatorios.");
      return;
    }
    if (!item && datos.password.length < 8) {
      await showError(
        "Contraseña débil",
        "La contraseña debe tener al menos 8 caracteres.",
      );
      return;
    }
    if (!item && datos.password !== datos.confirmarPassword) {
      await showError(
        "Contraseñas diferentes",
        "Las contraseñas no coinciden.",
      );
      return;
    }
    if (
      datos.tipo === ROLES.USUARIO &&
      (!TIPOS_ENTIDAD_USUARIO.includes(datos.entidadTipo) || !datos.entidadId)
    ) {
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
      if (item) await guardarUsuarioAdministrado(datos, item);
      else await crearUsuarioAdministrado(datos);
      await showSuccess(
        item ? "Usuario actualizado" : "Usuario registrado",
        item
          ? "Los datos y permisos quedaron sincronizados."
          : "Se crearon la credencial y el acceso interno correctamente.",
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
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
          <h2>{item ? "Editar usuario" : "Nuevo interno"}</h2>
          <div className="modal-spacer" />
        </div>
        <form onSubmit={guardar}>
          <div className="form-grid">
            {item && (
              <div className="form-group">
                <label>UID de Firebase Authentication</label>
                <input value={datos.uid} disabled />
              </div>
            )}
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
            {!item && (
              <>
                <div className="form-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={datos.password}
                    onChange={(event) =>
                      cambiar("password", event.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Confirmar contraseña</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={datos.confirmarPassword}
                    onChange={(event) =>
                      cambiar("confirmarPassword", event.target.value)
                    }
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Rol</label>
              <select
                value={datos.tipo}
                onChange={(event) => cambiarRol(event.target.value)}
              >
                {opcionesRoles.map(([tipo, nombre]) => (
                  <option key={tipo} value={tipo}>
                    {tipo} — {nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select
                value={String(datos.estado)}
                onChange={(event) =>
                  cambiar("estado", event.target.value === "true")
                }
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
                    value={datos.entidadTipo ?? ""}
                    onChange={(event) =>
                      setDatos((actual) => ({
                        ...actual,
                        entidadTipo: event.target.value,
                        entidadId: null,
                      }))
                    }
                  >
                    <option value="">Seleccioná un tipo</option>
                    <option value={ENTIDADES_USUARIO.CLIENTE}>Cliente</option>
                    <option value={ENTIDADES_USUARIO.PROVEEDOR}>
                      Proveedor
                    </option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Entidad relacionada</label>
                  <SearchableSelect
                    options={entidades}
                    value={datos.entidadId ?? ""}
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
              {item ? "Guardar" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

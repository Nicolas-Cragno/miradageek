import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../context/DataContext";
import { transferirStock } from "../../functions/operaciones/operacionesService";
import { showConfirmation, showError, showSuccess } from "../../utils/alerts";
import SearchableSelect from "../inputs/SearchableSelect";
import "./css/Form.css";

export default function TransferenciaForm({ open, onClose, onSave }) {
  const { user } = useAuth();
  const { productos = [], sucursales = [] } = useData();
  const [datos, setDatos] = useState({});
  const [guardando, setGuardando] = useState(false);
  if (!open) return null;

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    const ejecutar = (permitirNegativo) => transferirStock({
      idProducto: datos.idProducto,
      cantidad: datos.cantidad,
      sucursalOrigen: datos.sucursalOrigen,
      sucursalDestino: datos.sucursalDestino,
      detalle: datos.detalle,
      usuario: user.id,
      sucursalesDisponibles: sucursales.map((sucursal) => sucursal.id),
      permitirNegativo,
    });
    try {
      try {
        await ejecutar(false);
      } catch (error) {
        if (error?.code !== "stock-negativo") throw error;
        const confirmado = await showConfirmation(
          "Stock negativo",
          error.message,
          "Continuar igualmente",
        );
        if (!confirmado) return;
        await ejecutar(true);
      }
      await showSuccess("Transferencia registrada", "El movimiento fue atómico.");
      setDatos({});
      onSave?.();
      onClose?.();
    } catch (error) {
      await showError("No se pudo transferir", error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-form" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
          <h2>Transferencia entre sucursales</h2>
          <div className="modal-spacer" />
        </div>
        <form onSubmit={guardar}>
          <div className="form-grid">
            <div className="form-group">
              <label>Producto</label>
              <SearchableSelect
                options={productos}
                value={datos.idProducto || ""}
                getLabel={(producto) => producto.descripcion || producto.id}
                onChange={(idProducto) => setDatos((previo) => ({ ...previo, idProducto }))}
              />
            </div>
            {[
              ["sucursalOrigen", "Sucursal origen"],
              ["sucursalDestino", "Sucursal destino"],
            ].map(([campo, label]) => (
              <div className="form-group" key={campo}>
                <label>{label}</label>
                <SearchableSelect
                  options={sucursales}
                  value={datos[campo] || ""}
                  onChange={(valor) => setDatos((previo) => ({ ...previo, [campo]: valor }))}
                />
              </div>
            ))}
            <div className="form-group">
              <label>Cantidad</label>
              <input type="number" min="0.000001" step="any" value={datos.cantidad || ""}
                onChange={(event) => setDatos((previo) => ({ ...previo, cantidad: Number(event.target.value) }))} />
            </div>
            <div className="form-group">
              <label>Detalle</label>
              <textarea value={datos.detalle || ""}
                onChange={(event) => setDatos((previo) => ({ ...previo, detalle: event.target.value }))} />
            </div>
          </div>
          <div className="form-buttons">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : "Transferir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from "react";
import "./css/ListForm.css";

export default function ListForm({ productos = [], value = [], onChange }) {
  const listado = Array.isArray(value) ? value : [];

  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState("ARS");

  const agregarItem = () => {
    if (!producto) return;

    const prod = productos.find((p) => String(p.id) === String(producto));
    if (!prod) return;

    const cantidadNum = Number(cantidad);
    const precioNum = Number(precio);

    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) return;
    if (!Number.isFinite(precioNum) || precioNum < 0) return;

    const existente = listado.find(
      (x) => String(x.idProducto) === String(prod.id),
    );

    if (existente) {
      onChange(
        listado.map((item) =>
          item.idProducto === prod.id
            ? { ...item, cantidad: item.cantidad + cantidadNum }
            : item,
        ),
      );
    } else {
      onChange([
        ...listado,
        {
          idProducto: prod.id,
          descripcion: prod.descripcion || prod.nombre,
          cantidad: cantidadNum,
          precio: precioNum,
          moneda: moneda,
        },
      ]);
    }

    setProducto("");
    setCantidad(1);
    setPrecio(0); // ver nota abajo
  };

  const eliminarItem = (id) => {
    onChange(listado.filter((x) => x.idProducto !== id));
  };

  const total = listado.reduce(
    (acc, item) => acc + item.cantidad * item.precio,
    0,
  );

  const actualizarCantidad = (id, cantidad) => {
    const num = Number(cantidad);
    if (!Number.isFinite(num)) return; // ignorar estados intermedios que no son validos

    onChange(
      listado.map((item) =>
        item.idProducto === id ? { ...item, cantidad: num } : item,
      ),
    );
  };

  const actualizarPrecio = (id, precio) => {
    const num = Number(precio);
    if (!Number.isFinite(num)) return; // ignorar estados intermedios que no son validos
    onChange(
      listado.map((item) =>
        item.idProducto === id ? { ...item, precio: num } : item,
      ),
    );
  };

  return (
    <div className="listform">
      <div className="listform-header">
        <h3>Detalle de compra</h3>
      </div>

      <div className="listform-add">
        <select
          value={producto}
          onChange={(e) => {
            const id = e.target.value;
            setProducto(id);

            const prod = productos.find((p) => String(p.id) === String(id));

            if (prod) {
              setPrecio(prod.precio || 0);
            }
          }}
        >
          <option value="">Seleccionar producto...</option>

          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.descripcion || p.nombre}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          placeholder="Cant."
        />

        <input
          type="number"
          min="0"
          value={precio}
          onChange={(e) => setPrecio(Number(e.target.value))}
          placeholder="Precio"
        />

        <select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
          <option value="ARS">Pesos ($)</option>
          <option value="USD">Dólares (U$S)</option>
        </select>

        <button type="button" className="btn-add" onClick={agregarItem}>
          Agregar
        </button>
      </div>

      <table className="listform-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Moneda</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {listado.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">
                Sin productos agregados
              </td>
            </tr>
          )}

          {listado.map((item) => (
            <tr key={item.idProducto}>
              <td>{item.descripcion}</td>

              <td>
                <input
                  type="number"
                  min="1"
                  //step="0.01" // por las dudas para flotantes
                  value={item.cantidad}
                  onChange={(e) =>
                    actualizarCantidad(item.idProducto, e.target.value)
                  }
                />
              </td>

              <td>
                <input
                  type="number"
                  value={item.precio}
                  onChange={(e) =>
                    actualizarPrecio(item.idProducto, e.target.value)
                  }
                />
              </td>
              <td>{item.moneda}</td>

              <td>${(item.cantidad * item.precio).toLocaleString()}</td>

              <td>
                <button
                  type="button"
                  className="btn-delete"
                  onClick={() => eliminarItem(item.idProducto)}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="listform-total">
        <span>Total</span>
        <strong>${total.toLocaleString()}</strong>
      </div>
    </div>
  );
}

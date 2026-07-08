import { useState } from "react";
import "./css/ListForm.css";

export default function ListForm({ productos = [], value = [], onChange }) {
  const listado = Array.isArray(value) ? value : [];

  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");

  const agregarItem = () => {
    if (!producto) return;

    const prod = productos.find((p) => String(p.id) === String(producto));

    if (!prod) return;

    const existente = listado.find(
      (x) => String(x.idProducto) === String(prod.id),
    );

    if (existente) {
      onChange(
        listado.map((x) =>
          x.idProducto === prod.id
            ? {
                ...x,
                cantidad: x.cantidad + Number(cantidad),
              }
            : x,
        ),
      );
    } else {
      onChange([
        ...listado,
        {
          id: Date.now(),
          idProducto: prod.id,
          descripcion: prod.descripcion || prod.nombre,
          cantidad: Number(cantidad),
          precio: Number(precio),
        },
      ]);
    }

    setProducto("");
    setCantidad(1);
    setPrecio("");
  };

  const eliminarItem = (id) => {
    onChange(listado.filter((x) => x.id !== id));
  };

  const total = listado.reduce(
    (acc, item) => acc + item.cantidad * item.precio,
    0,
  );

  const actualizarCantidad = (id, cantidad) => {
    onChange(
      listado.map((item) =>
        item.id === id ? { ...item, cantidad: Number(cantidad) } : item,
      ),
    );
  };

  const actualizarPrecio = (id, precio) => {
    onChange(
      listado.map((item) =>
        item.id === id ? { ...item, precio: Number(precio) } : item,
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
            <tr key={item.id}>
              <td>{item.descripcion}</td>

              <td>
                <input
                  type="number"
                  min="1"
                  value={item.cantidad}
                  onChange={(e) => actualizarCantidad(item.id, e.target.value)}
                />
              </td>

              <td>
                <input
                  type="number"
                  value={item.precio}
                  onChange={(e) => actualizarPrecio(item.id, e.target.value)}
                />
              </td>

              <td>${(item.cantidad * item.precio).toLocaleString()}</td>

              <td>
                <button
                  type="button"
                  className="btn-delete"
                  onClick={() => eliminarItem(item.id)}
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

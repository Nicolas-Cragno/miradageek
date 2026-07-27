import { useState } from "react";
import "./css/ListForm.css";

export default function ListStockForm({
  productos = [],
  value = [],
  onChange,
}) {
  const listado = Array.isArray(value) ? value : [];

  const [producto, setProducto] = useState("");
  const [stockNuevo, setStockNuevo] = useState("");

  const agregarItem = () => {
    if (!producto) return;

    const prod = productos.find((p) => String(p.id) === String(producto));
    if (!prod) return;

    const nuevo = Number(stockNuevo);

    if (!Number.isFinite(nuevo) || nuevo < 0) return;

    const actual = Number(prod.stock || 0);

    const item = {
      idProducto: prod.id,
      descripcion: prod.descripcion || prod.nombre,
      stockActual: actual,
      stockNuevo: nuevo,
      diferencia: nuevo - actual,
    };

    const existente = listado.find(
      (x) => String(x.idProducto) === String(prod.id),
    );

    if (existente) {
      onChange(listado.map((x) => (x.idProducto === prod.id ? item : x)));
    } else {
      onChange([...listado, item]);
    }

    setProducto("");
    setStockNuevo("");
  };

  const eliminarItem = (id) => {
    onChange(listado.filter((x) => x.idProducto !== id));
  };

  const actualizarStock = (id, valor) => {
    const num = Number(valor);

    if (!Number.isFinite(num)) return;

    onChange(
      listado.map((item) =>
        item.idProducto === id
          ? {
              ...item,
              stockNuevo: num,
              diferencia: num - item.stockActual,
            }
          : item,
      ),
    );
  };

  return (
    <div className="listform">
      <div className="listform-add">
        <select
          value={producto}
          onChange={(e) => {
            const id = e.target.value;

            setProducto(id);

            const prod = productos.find((p) => String(p.id) === String(id));

            if (prod) {
              setStockNuevo(prod.stock ?? 0);
            }
          }}
        >
          <option value="">Seleccionar producto...</option>

          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.descripcion || p.nombre} (Stock: {p.stock ?? 0})
            </option>
          ))}
        </select>

        <div className="stock-actions">
          <input
            type="number"
            min="0"
            value={stockNuevo}
            placeholder="Nuevo stock"
            onChange={(e) => setStockNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarItem();
              }
            }}
          />

          <button type="button" className="btn-add" onClick={agregarItem}>
            Agregar
          </button>
        </div>
      </div>

      <table className="listform-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Actual</th>
            <th>Nuevo</th>
            <th>Dif.</th>
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

              <td>{item.stockActual}</td>

              <td>
                <input
                  type="number"
                  min="0"
                  value={item.stockNuevo}
                  onChange={(e) =>
                    actualizarStock(item.idProducto, e.target.value)
                  }
                />
              </td>

              <td
                className={
                  item.diferencia > 0
                    ? "stock-up"
                    : item.diferencia < 0
                      ? "stock-down"
                      : ""
                }
              >
                {item.diferencia > 0 && "+"}
                {item.diferencia}
              </td>

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
    </div>
  );
}

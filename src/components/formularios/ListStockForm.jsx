import { useState } from "react";
import "./css/ListForm.css";
import SearchableSelect from "../inputs/SearchableSelect";
import {
  normalizarTipoMovimiento,
  TIPOS_MOVIMIENTO,
} from "../../functions/operaciones/modeloOperaciones";

const productLabel = (product) =>
  `${product.descripcion || product.nombre || product.id} (Stock: ${product.stock ?? 0})`;

export default function ListStockForm({
  productos = [],
  value = [],
  onChange,
  tipoMovimiento,
  sucursalMovimiento,
}) {
  const listado = Array.isArray(value) ? value : [];

  const [producto, setProducto] = useState("");
  const [stockNuevo, setStockNuevo] = useState("");

  const agregarItem = () => {
    if (!producto) return;

    const prod = productos.find((p) => String(p.id) === String(producto));
    if (!prod) return;

    const valorIngresado = Number(stockNuevo);

    if (!Number.isFinite(valorIngresado)) return;

    const distribucionValida = Array.isArray(prod.stockSucursal);
    const stockSucursal = distribucionValida
      ? prod.stockSucursal.find((item) => item?.sucursal === sucursalMovimiento)
      : null;
    const actual = Number(stockSucursal?.stock ?? prod.stock ?? 0);
    const tipo = normalizarTipoMovimiento(tipoMovimiento);
    const diferencia =
      tipo === TIPOS_MOVIMIENTO.INGRESO
        ? Math.abs(valorIngresado)
        : tipo === TIPOS_MOVIMIENTO.EGRESO
          ? -Math.abs(valorIngresado)
          : valorIngresado - actual;
    const nuevo = actual + diferencia;

    const item = {
      idProducto: prod.id,
      descripcion: prod.descripcion || prod.nombre,
      stockActual: actual,
      stockNuevo: nuevo,
      diferencia,
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
        <SearchableSelect
          options={productos}
          value={producto}
          placeholder="Buscar producto..."
          getLabel={productLabel}
          onChange={(id) => {

            setProducto(id);

            const prod = productos.find((p) => String(p.id) === String(id));

            if (prod) {
              const stockSucursal = Array.isArray(prod.stockSucursal)
                ? prod.stockSucursal.find(
                    (item) => item?.sucursal === sucursalMovimiento,
                  )
                : null;
              setStockNuevo(
                normalizarTipoMovimiento(tipoMovimiento) === TIPOS_MOVIMIENTO.AJUSTE
                  ? stockSucursal?.stock ?? prod.stock ?? 0
                  : "",
              );
            }
          }}
        />

        <div className="stock-actions">
          <input
            type="number"
            value={stockNuevo}
            placeholder={
              normalizarTipoMovimiento(tipoMovimiento) === TIPOS_MOVIMIENTO.AJUSTE
                ? "Nuevo stock"
                : "Cantidad"
            }
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

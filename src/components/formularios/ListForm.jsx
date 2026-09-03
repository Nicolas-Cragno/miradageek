import { useState } from "react";
import "./css/ListForm.css";
import SearchableSelect from "../inputs/SearchableSelect";

const productLabel = (product) =>
  (product.descripcion && product.id + " | " + product.descripcion) ||
  product.nombre ||
  product.id;

export default function ListForm({
  productos = [],
  value = [],
  onChange,
  tipoOperacion,
  monedaOperacion = "ARS",
  valorDivisa = 1,
}) {
  const listado = Array.isArray(value) ? value : [];

  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");
  const [monedaError, setMonedaError] = useState("");

  const agregarItem = () => {
    if (!producto || monedaError) return;

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
          String(item.idProducto) === String(prod.id)
            ? {
                ...item,
                cantidad: Number(item.cantidad) + cantidadNum,
                precio: precioNum,
                moneda: monedaOperacion,
              }
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
          moneda: monedaOperacion,
          cantidadCumplida: 0,
        },
      ]);
    }

    setProducto("");
    setCantidad(1);
    setPrecio("");
  };

  const eliminarItem = (id) => {
    onChange(listado.filter((x) => String(x.idProducto) !== String(id)));
  };

  const total = listado.reduce(
    (acc, item) => acc + item.cantidad * item.precio,
    0,
  );

  const actualizarCantidad = (id, cantidad) => {
    const num = Number(cantidad);
    if (!Number.isFinite(num) || num <= 0) return;

    onChange(
      listado.map((item) =>
        String(item.idProducto) === String(id)
          ? { ...item, cantidad: num }
          : item,
      ),
    );
  };

  const actualizarPrecio = (id, precio) => {
    const num = Number(precio);
    if (!Number.isFinite(num) || num < 0) return;
    onChange(
      listado.map((item) =>
        String(item.idProducto) === String(id)
          ? { ...item, precio: num }
          : item,
      ),
    );
  };

  return (
    <div className="listform">
      <div className="listform-header">
        <h3>
          {tipoOperacion === "venta" ? "Detalle de venta" : "Detalle de compra"}
        </h3>
      </div>

      <div className="listform-add">
        <SearchableSelect
          options={productos}
          value={producto}
          placeholder="Buscar producto..."
          getLabel={productLabel}
          onChange={(id) => {
            setProducto(id);
            setMonedaError("");

            const prod = productos.find((p) => String(p.id) === String(id));

            if (prod) {
              const precioProducto =
                tipoOperacion === "compra" ? prod.costo : prod.precio;
              const precioNumerico = Number(precioProducto);
              const monedaProducto =
                tipoOperacion === "compra"
                  ? prod.monedaCosto || "ARS"
                  : prod.monedaPrecio || "ARS";
              const monedaNormalizada = String(monedaProducto)
                .trim()
                .toUpperCase();
              let origen;
              if (["ARS", "PESO", "PESOS"].includes(monedaNormalizada)) {
                origen = "ARS";
              } else if (
                ["USD", "DOLARES", "DÓLARES"].includes(monedaNormalizada)
              ) {
                origen = "USD";
              } else {
                setPrecio("");
                setMonedaError(
                  `El producto tiene una moneda de precio no soportada: ${monedaProducto}.`,
                );
                return;
              }
              const destino = monedaOperacion || "ARS";
              const cotizacion = Number(valorDivisa);
              let convertido = Number.isFinite(precioNumerico)
                ? precioNumerico
                : 0;
              if (origen === "USD" && destino === "ARS") {
                convertido *=
                  Number.isFinite(cotizacion) && cotizacion > 0
                    ? cotizacion
                    : 1;
              } else if (origen === "ARS" && destino === "USD") {
                convertido /=
                  Number.isFinite(cotizacion) && cotizacion > 0
                    ? cotizacion
                    : 1;
              }
              setPrecio(convertido);
            }
          }}
        />

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

        <span>{monedaOperacion}</span>

        <button type="button" className="btn-add" onClick={agregarItem}>
          Agregar
        </button>
      </div>

      {monedaError && <p className="form-error">{monedaError}</p>}

      <table className="listform-table">
        <thead>
          <tr>
            <th></th>
            <th>Código</th>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Cumplida</th>

            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {listado.length === 0 && (
            <tr>
              <td colSpan={8} className="empty">
                Sin productos agregados
              </td>
            </tr>
          )}

          {listado.map((item, index) => (
            <tr key={item.idProducto}>
              <td className="td-index">{index + 1}.</td>
              <td className="td-codigo">{item.idProducto}</td>
              <td className="td-descripcion">{item.descripcion}</td>

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
              <td>{Number(item.cantidadCumplida || 0)} / {Number(item.cantidad)}</td>

              <td>{item.moneda} {(item.cantidad * item.precio).toLocaleString()}</td>

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

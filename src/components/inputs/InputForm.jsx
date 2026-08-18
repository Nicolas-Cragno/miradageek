import { Timestamp } from "firebase/firestore";
import ListForm from "../formularios/ListForm.jsx";
import ListStockForm from "../formularios/ListStockForm.jsx";
import { useData } from "../../context/DataContext.jsx";
import SearchableSelect from "./SearchableSelect.jsx";

export default function InputForm({
  campo,
  value,
  onChange,
  detailRef,
  monedaOperacion,
  valorDivisa,
  tipoMovimiento,
  sucursalMovimiento,
}) {
  const { key, label, input = "text", options } = campo;
  const data = useData();

  function handleChange(e) {
    let val = e.target.value;

    if (input === "date") {
      val = val ? Timestamp.fromDate(new Date(val)) : null;
    }

    if (input === "number") {
      val = val === "" ? "" : Number(val);
    }

    onChange(key, val);
  }

  return (
    <div className="form-group">
      <label>{label}</label>

      {input === "disabled" && (
        <span className="form-disabled">{value ?? "-"}</span>
      )}

      {input === "textarea" && (
        <textarea value={value ?? ""} onChange={handleChange} />
      )}

      {input === "select" && (
        <SearchableSelect
          options={data[options] || []}
          value={value ?? ""}
          placeholder={`Buscar ${label.toLocaleLowerCase("es")}...`}
          onChange={(newValue) => onChange(key, newValue)}
        />
      )}

      {input === "staticSelect" && (
        <select value={value ?? ""} onChange={handleChange}>
          {(campo.values || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {input === "date" && (
        <input
          type="date"
          value={value ? value.toDate().toISOString().split("T")[0] : ""}
          onChange={handleChange}
        />
      )}

      {(input === "text" || input === "number") && (
        <input type={input} value={value ?? ""} onChange={handleChange} />
      )}

      {input === "list" && (
        <ListForm
          productos={data[options] || []}
          value={value ?? []}
          tipoOperacion={detailRef}
          monedaOperacion={monedaOperacion}
          valorDivisa={valorDivisa}
          onChange={(nuevoValor) => onChange(key, nuevoValor)}
        />
      )}
      {input === "listStock" && (
        <ListStockForm
          productos={data[options] || []}
          value={value ?? []}
          tipoMovimiento={tipoMovimiento}
          sucursalMovimiento={sucursalMovimiento}
          onChange={(nuevoValor) => onChange(key, nuevoValor)}
        />
      )}
    </div>
  );
}

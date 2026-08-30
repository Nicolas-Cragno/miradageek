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
  readOnly = false,
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
      <label>
        {label}
        {campo.required ? " *" : ""}
      </label>

      {input === "disabled" && (
        <span className="form-disabled">{value ?? "-"}</span>
      )}

      {input === "textarea" && (
        <textarea
          value={value ?? ""}
          onChange={handleChange}
          required={campo.required}
        />
      )}

      {input === "select" && (
        <SearchableSelect
          options={(data[options] || []).filter(
            (option) => !(campo.excludeIds || []).includes(option.id),
          )}
          value={value ?? ""}
          placeholder={`Buscar ${label.toLocaleLowerCase("es")}...`}
          onChange={(newValue) => onChange(key, newValue)}
          required={campo.required}
        />
      )}

      {input === "staticSelect" && (
        <select
          value={value ?? ""}
          onChange={handleChange}
          disabled={readOnly}
          required={campo.required}
        >
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
          required={campo.required}
        />
      )}

      {(input === "text" || input === "number") && (
        <input
          type={input}
          value={value ?? ""}
          min={input === "number" ? campo.min : undefined}
          max={input === "number" ? campo.max : undefined}
          onChange={handleChange}
          readOnly={readOnly}
          required={campo.required}
        />
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

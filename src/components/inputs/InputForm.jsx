import OptionsContent from "../formularios/OptionsContent";
import { Timestamp } from "firebase/firestore";
import ListForm from "../formularios/ListForm.jsx";
import ListStockForm from "../formularios/ListStockForm.jsx";
import { useData } from "../../context/DataContext.jsx";

export default function InputForm({ campo, value, onChange }) {
  const { key, label, input = "text", options } = campo;
  const data = useData();

  function handleChange(e) {
    let val = e.target.value;

    if (input === "date") {
      val = val ? Timestamp.fromDate(new Date(val)) : null;
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
        <select value={value ?? ""} onChange={handleChange}>
          <OptionsContent options={options} />
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
          onChange={(nuevoValor) => onChange(key, nuevoValor)}
        />
      )}
      {input === "listStock" && (
        <ListStockForm
          productos={data[options] || []}
          value={value ?? []}
          onChange={(nuevoValor) => onChange(key, nuevoValor)}
        />
      )}
    </div>
  );
}

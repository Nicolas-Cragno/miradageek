import OptionsContent from "../formularios/OptionsContent";
import { Timestamp } from "firebase/firestore";

export default function InputForm({ campo, value, onChange }) {
  const { key, label, input = "text", options } = campo;

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
    </div>
  );
}

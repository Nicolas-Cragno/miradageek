import OptionsContent from "../formularios/OptionsContent";

export default function InputForm({ campo, value, onChange }) {
  const { key, label, input = "text", options } = campo;

  function handleChange(e) {
    onChange(key, e.target.value);
  }

  return (
    <div className="form-group">
      <label>{label}</label>

      {input === "textarea" && (
        <textarea value={value ?? ""} onChange={handleChange} />
      )}

      {input === "select" && (
        <select value={value ?? ""} onChange={handleChange}>
          <OptionsContent options={options} />
        </select>
      )}

      {(input === "text" || input === "number") && (
        <input type={input} value={value ?? ""} onChange={handleChange} />
      )}
    </div>
  );
}

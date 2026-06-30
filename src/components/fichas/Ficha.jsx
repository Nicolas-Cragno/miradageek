import Logo from "../../assets/logos/Logo.png";
import "./css/Ficha.css";

export default function Ficha({ item, campos = [], onEdit }) {
  if (!item) {
    return <img src={Logo} alt="empty" className="ficha-logo" />;
  }

  const camposFicha = campos.filter((campo) => campo.ficha);

  return (
    <div className="ficha-container">
      <div className="ficha-image-header">
        <img
          src={item.imagen || Logo}
          alt={item.descripcion || item.nombre || "item"}
          className="ficha-main-image"
        />
      </div>

      <div className="detalle-grid">
        {camposFicha.map((campo) => (
          <div key={campo.key} className="detalle-item">
            <strong>{campo.label}</strong>

            <span>
              {typeof item[campo.key] === "object"
                ? JSON.stringify(item[campo.key])
                : String(item[campo.key] ?? "-")}
            </span>
          </div>
        ))}
      </div>
      <div className="ficha-toolbar">
        <button className="btn-edit" onClick={onEdit}>
          ✏️ Editar
        </button>
      </div>
    </div>
  );
}

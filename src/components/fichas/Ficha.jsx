import Logo from "../../assets/logos/Logo.png";
import { formatearCampoFirestore } from "../../functions/DataFunctions";
import TextButton from "../buttons/TextButton";
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
        {camposFicha.map((campo) => {
          const valor = formatearCampoFirestore(item[campo.key]);

          return (
            <div key={campo.key} className="detalle-item">
              <strong>{campo.label}</strong>

              {Array.isArray(valor) ? (
                <ul className="detalle-lista">
                  {valor.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              ) : (
                <span style={{ whiteSpace: "pre-line" }}>{valor}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="ficha-toolbar">
        <TextButton text="Editar" onClick={onEdit} />
      </div>
    </div>
  );
}

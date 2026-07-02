import "./css/CardIcon.css";

const CardIcon = ({ icon, text, onClick = null }) => {
  return (
    <button type="button" className="card-icon " onClick={onClick}>
      <span className="card-icon-logo">{icon}</span>

      <h2 className="card-icon-text link">{text}</h2>
      <span className="card-icon-go">⟩</span>
    </button>
  );
};

export default CardIcon;

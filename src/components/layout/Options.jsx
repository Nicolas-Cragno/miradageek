import { Link } from "react-router-dom";
import CardIcon from "../cards/CardIcon";
import "./css/Options.css";

export default function Options({ options = [], onClick }) {
  return (
    <div className="options" onClick={onClick}>
      <div className="options-content" onClick={(e) => e.stopPropagation()}>
        {options.map(({ to, icon, label }) => (
          <Link key={to} to={to} onClick={onClick} className="link">
            <CardIcon icon={icon} text={label} />
          </Link>
        ))}
      </div>
    </div>
  );
}

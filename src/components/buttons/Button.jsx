import "./css/Buttons.css";
import { FaPlusCircle } from "react-icons/fa";

const Button = ({
  text = "",
  type = "button",
  img = null,
  plus = false,
  onClick,
}) => {
  return (
    <>
      <button
        className="btn-std-body"
        onClick={onClick}
        type={type}
        style={{
          backgroundImage: img ? `url(${img})` : "none",
        }}
      >
        {text}
        {plus && <div className="btn-add">+</div>}
      </button>
    </>
  );
};

export default Button;

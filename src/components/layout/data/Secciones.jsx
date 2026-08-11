import { MdOutlineSmartToy as ToyLogo } from "react-icons/md";

import { IoPerson as CustomerLogo } from "react-icons/io5";
import { LuBaggageClaim as ProviderLogo } from "react-icons/lu";
import { FaCashRegister } from "react-icons/fa";
import { IoCash } from "react-icons/io5";

export const linksElements = [
  {
    to: "/productos",
    icon: <ToyLogo className="nav-icon" size={50} />,
    label: "Productos",
  },
  {
    to: "/clientes",
    icon: <CustomerLogo className="nav-icon" size={50} />,
    label: "Clientes",
  },
  {
    to: "/proveedores",
    icon: <ProviderLogo className="nav-icon" size={50} />,
    label: "Proveedores",
  },
];
export const linksEvents = [
  {
    to: "/compras",
    icon: <FaCashRegister className="nav-icon" size={50} />,
    label: "Compras",
  },
  {
    to: "/ventas",
    icon: <IoCash className="nav-icon" size={50} />,
    label: "Ventas",
  },
];

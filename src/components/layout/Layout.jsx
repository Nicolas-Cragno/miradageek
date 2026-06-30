import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import { Outlet } from "react-router-dom";
import "./css/Layout.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className={`layout-content ${sidebarOpen ? "open" : "closed"}`}>
        <Outlet />
      </div>
    </div>
  );
}

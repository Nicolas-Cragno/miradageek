import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Lowbar from "./Lowbar";
import { Outlet } from "react-router-dom";
import "./css/Layout.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width:768px) and (hover:none) and (pointer:coarse)",
    );

    const update = () => setIsMobile(media.matches);

    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div className="layout">
      {!isMobile && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />}

      <div className={`layout-content ${sidebarOpen ? "open" : "closed"}`}>
        <Outlet />
      </div>

      {isMobile && <Lowbar />}
    </div>
  );
}

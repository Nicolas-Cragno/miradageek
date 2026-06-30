import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./routes/App.jsx";
import { DataProvider } from "./context/DataContext.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import "./assets/styles/colors.css";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DataProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DataProvider>
  </StrictMode>,
);

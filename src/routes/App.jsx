import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <ProtectedRoute>
      <h1>Dashboard</h1>
    </ProtectedRoute>
  );
}

import { useAuth } from "../auth/AuthContext";
import Login from "./Login";
import Loading from "./Loading";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  if (!user) return <Login />;

  return children;
}

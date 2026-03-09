import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0f0f1a",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{ color: "#6366f1", fontSize: "1.2rem", fontWeight: 600 }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
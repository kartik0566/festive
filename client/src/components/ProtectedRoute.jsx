import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const PublicRoute = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <main className="page center-page">
        <div className="loader" />
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <main className="page center-page">
        <div className="loader" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export { PublicRoute };
export default ProtectedRoute;


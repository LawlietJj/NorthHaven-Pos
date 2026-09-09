import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../api/auth";

const ROLE_HOME = {
  owner: "/owner-dashboard",
  manager: "/manager-dashboard",
  cashier: "/pos",
};

function ProtectedRoutes({ allowedRoles, children }) {
  const user = getCurrentUser();

  // Not logged in at all — send to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but this role isn't allowed on this specific page —
  // send them back to wherever THEY'RE supposed to land, not /login
  // (they're not unauthenticated, just in the wrong place).
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || "/login"} replace />;
  }

  return children;
}

export default ProtectedRoutes;
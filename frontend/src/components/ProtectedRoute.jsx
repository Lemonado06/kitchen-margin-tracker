import { Navigate } from 'react-router-dom';
import { getUser, homePath } from '../api/client';

// Only render the page when a login token exists and, if roles are given, the user has one of them.
// `role="owner"` and `roles={['owner', 'manager']}` both work.
export default function ProtectedRoute({ role, roles, children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  const allowed = roles || (role ? [role] : null);
  if (allowed && !allowed.includes(getUser().role)) return <Navigate to={homePath()} replace />;
  return children;
}
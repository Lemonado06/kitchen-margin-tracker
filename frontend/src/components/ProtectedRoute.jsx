import { Navigate } from 'react-router-dom';
import { getUser } from '../api/client';

// Only render the page when a login token exists (and, if given, the user has the required role)
export default function ProtectedRoute({ role, children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (role && getUser().role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

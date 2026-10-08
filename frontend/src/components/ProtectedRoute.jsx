import { Navigate } from 'react-router-dom';

// Only render the page when a login token exists; otherwise go to /login
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

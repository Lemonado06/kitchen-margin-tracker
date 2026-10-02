import { Link } from 'react-router-dom';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, {user.name || 'User'}</h1>
      <p className="text-gray-600 mb-4">Role: {user.role}</p>
      <Link to="/outlets" className="text-blue-600 underline">Manage Outlets</Link>
    </div>
  );
}
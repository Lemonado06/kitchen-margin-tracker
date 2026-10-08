import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Outlets from './pages/Outlets';
import Dishes from './pages/Dishes';
import Orders from './pages/Orders';
import FeeRules from './pages/FeeRules';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/outlets" element={<ProtectedRoute><Outlets /></ProtectedRoute>} />
        <Route path="/outlets/:outletId/dishes" element={<ProtectedRoute><Dishes /></ProtectedRoute>} />
        <Route path="/outlets/:outletId/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/outlets/:outletId/fee-rules" element={<ProtectedRoute><FeeRules /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

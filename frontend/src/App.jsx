import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Outlets from './pages/Outlets';
import Dishes from './pages/Dishes';
import Orders from './pages/Orders';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/outlets" element={<Outlets />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/outlets/:outletId/dishes" element={<Dishes />} />
        <Route path="/outlets/:outletId/orders" element={<Orders />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
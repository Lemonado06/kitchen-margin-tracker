import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Outlets from './pages/Outlets';
import Dishes from './pages/Dishes';
import Orders from './pages/Orders';
import FeeRules from './pages/FeeRules';
import Team from './pages/Team';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { FeedbackProvider } from './components/Feedback';

function App() {
  return (
    <FeedbackProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/outlets" element={<Outlets />} />
            <Route path="/outlets/:outletId/dishes" element={<Dishes />} />
            <Route path="/outlets/:outletId/orders" element={<Orders />} />
            <Route path="/outlets/:outletId/fee-rules" element={<FeeRules />} />
            <Route path="/team" element={<ProtectedRoute role="owner"><Team /></ProtectedRoute>} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </FeedbackProvider>
  );
}

export default App;

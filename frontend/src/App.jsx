
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
import Activity from './pages/Activity';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { FeedbackProvider } from './components/Feedback';
import { homePath } from './api/client';

// Owners and managers see profit and costs.
const PROFIT_ROLES = ['owner', 'manager'];

function App() {
  return (
    <FeedbackProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route
              path="/dashboard"
              element={<ProtectedRoute roles={PROFIT_ROLES}><Dashboard /></ProtectedRoute>}
            />

            <Route path="/outlets" element={<Outlets />} />

            <Route
              path="/outlets/:outletId/dishes"
              element={<ProtectedRoute roles={PROFIT_ROLES}><Dishes /></ProtectedRoute>}
            />

            <Route path="/outlets/:outletId/orders" element={<Orders />} />

            <Route
              path="/outlets/:outletId/fee-rules"
              element={<ProtectedRoute roles={PROFIT_ROLES}><FeeRules /></ProtectedRoute>}
            />

            <Route
              path="/team"
              element={<ProtectedRoute role="owner"><Team /></ProtectedRoute>}
            />

            <Route
              path="/activity"
              element={<ProtectedRoute role="owner"><Activity /></ProtectedRoute>}
            />

            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to={homePath()} />} />
        </Routes>
      </BrowserRouter>
    </FeedbackProvider>
  );
}

export default App;

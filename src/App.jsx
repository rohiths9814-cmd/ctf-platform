import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import TeamSetup from './pages/TeamSetup';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Challenges from './pages/Challenges';
import Leaderboard from './pages/Leaderboard';
import TeamProfile from './pages/TeamProfile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />

          {/* Team setup (requires auth, no team needed) */}
          <Route path="/team-setup" element={<ProtectedRoute><TeamSetup /></ProtectedRoute>} />

          {/* Protected routes (requires auth) */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/team/:id" element={<TeamProfile />} />
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProtectedRoute({ roles }) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // superadmin supervises everything and bypasses per-role route restrictions
  if (roles && user.role !== 'superadmin' && !roles.includes(user.role)) return <Navigate to="/home" replace />;
  if (user.role === 'student' && !user.classe && location.pathname !== '/choose-class') {
    return <Navigate to="/choose-class" replace />;
  }
  return <Outlet />;
}

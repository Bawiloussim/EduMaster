import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProtectedRoute({ roles }) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/home" replace />;
  return <Outlet />;
}

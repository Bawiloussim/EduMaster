import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

export const useAuth = () => {
  const { user, accessToken, setAuth, logout: storeLogout } = useAuthStore();

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.data, data.accessToken);
    return data.data;
  };

  const register = async (name, email, password, role) => {
    const { data } = await api.post('/auth/register', { name, email, password, role });
    setAuth(data.data, data.accessToken);
    return data.data;
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    storeLogout();
  };

  const isAdmin = user?.role === 'admin';
  const isInstructor = user?.role === 'instructor';
  const isStudent = user?.role === 'student';

  return { user, accessToken, login, register, logout, isAdmin, isInstructor, isStudent };
};

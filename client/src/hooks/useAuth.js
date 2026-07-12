import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

export const useAuth = () => {
  const { user, accessToken, setAuth, setUser, logout: storeLogout } = useAuthStore();

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.data, data.accessToken);
    return data.data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    if (data.pending) return { pending: true, message: data.message };
    setAuth(data.data, data.accessToken);
    return data.data;
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    storeLogout();
  };

  const setClasse = async (classe, serie) => {
    const { data } = await api.patch('/auth/me/classe', { classe, serie });
    setUser({ ...user, ...data.data });
    return data.data;
  };

  const isAdmin = user?.role === 'admin';
  const isInstructor = user?.role === 'instructor';
  const isStudent = user?.role === 'student';

  return { user, accessToken, login, register, logout, setClasse, isAdmin, isInstructor, isStudent };
};

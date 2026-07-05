import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, token) => set({ user, accessToken: token }),
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'edumaster-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
);

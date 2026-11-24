import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@shared';

interface AuthState {
  user:    AuthUser | null;
  setAuth: (user: AuthUser) => void;
  clear:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:    null,
      setAuth: (user) => set({ user }),
      clear:   () => set({ user: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

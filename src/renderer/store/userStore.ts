import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  userId: string | null;
  userName: string | null;
  email: string | null;
  themePreference: 'light' | 'dark' | 'system';
  defaultModel: string;
  setUser: (userId: string, userName: string, email: string) => void;
  clearUser: () => void;
  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
  setDefaultModel: (model: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      email: null,
      themePreference: 'system',
      defaultModel: 'gpt-4',

      setUser: (userId, userName, email) => {
        set({ userId, userName, email });
      },

      clearUser: () => {
        set({ userId: null, userName: null, email: null });
      },

      setThemePreference: (theme) => {
        set({ themePreference: theme });
      },

      setDefaultModel: (model) => {
        set({ defaultModel: model });
      },
    }),
    {
      name: 'user-store',
    }
  )
);

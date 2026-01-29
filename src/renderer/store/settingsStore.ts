import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  audioEnabled: boolean;
  notificationsEnabled: boolean;
  expertModelSelection: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  autoStartEnabled: boolean;
  updateCheckInterval: number; // in hours
  setAudioEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setExpertModelSelection: (model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo') => void;
  setAutoStartEnabled: (enabled: boolean) => void;
  setUpdateCheckInterval: (hours: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      audioEnabled: true,
      notificationsEnabled: true,
      expertModelSelection: 'gpt-4',
      autoStartEnabled: false,
      updateCheckInterval: 24,

      setAudioEnabled: (enabled) => {
        set({ audioEnabled: enabled });
      },

      setNotificationsEnabled: (enabled) => {
        set({ notificationsEnabled: enabled });
      },

      setExpertModelSelection: (model) => {
        set({ expertModelSelection: model });
      },

      setAutoStartEnabled: (enabled) => {
        set({ autoStartEnabled: enabled });
      },

      setUpdateCheckInterval: (hours) => {
        set({ updateCheckInterval: hours });
      },
    }),
    {
      name: 'settings-store',
    }
  )
);

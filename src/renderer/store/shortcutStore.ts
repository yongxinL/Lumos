import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHORTCUTS, hasShortcutConflict } from '../config/shortcuts';
import type {
  ShortcutStore,
  ShortcutConfig,
  UsageStats,
  ShortcutConflict,
  Shortcut,
} from '../types/shortcuts';

const STORAGE_KEY = 'lumos-shortcuts';

interface ShortcutStoreState extends ShortcutStore {
  conflicts: ShortcutConflict[];
  usageStats: Map<string, UsageStats>;
  updateConflicts(): void;
}

/**
 * Zustand store for keyboard shortcuts
 * Persists custom shortcuts to localStorage
 */
export const useShortcutStore = create<ShortcutStoreState>()(
  persist(
    (set, get) => ({
      shortcuts: {
        default: SHORTCUTS,
        custom: {},
      },
      conflicts: [],
      usageStats: new Map(),

      addCustomShortcut: (config: ShortcutConfig) => {
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            custom: {
              ...state.shortcuts.custom,
              [config.id]: config,
            },
          },
        }));
        get().updateConflicts();
      },

      removeCustomShortcut: (id: string) => {
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _, ...rest } = state.shortcuts.custom || {};
          return {
            shortcuts: {
              ...state.shortcuts,
              custom: rest,
            },
          };
        });
        get().updateConflicts();
      },

      updateShortcut: (id: string, config: Partial<ShortcutConfig>) => {
        set((state) => {
          const current = state.shortcuts.custom?.[id] || state.shortcuts.default[id];
          if (!current) return state;

          const updated = { ...current, ...config } as ShortcutConfig;

          if (state.shortcuts.custom?.[id]) {
            return {
              shortcuts: {
                ...state.shortcuts,
                custom: {
                  ...state.shortcuts.custom,
                  [id]: updated,
                },
              },
            };
          }

          return {
            shortcuts: {
              ...state.shortcuts,
              custom: {
                ...state.shortcuts.custom,
                [id]: updated,
              },
            },
          };
        });
        get().updateConflicts();
      },

      hasConflict: (id: string): boolean => {
        const state = get();
        return state.conflicts.some((c) => c.id1 === id || c.id2 === id);
      },

      recordUsage: (id: string) => {
        set((state) => {
          const newStats = new Map(state.usageStats);
          const current = newStats.get(id);

          newStats.set(id, {
            count: (current?.count ?? 0) + 1,
            lastUsed: new Date(),
          });

          return { usageStats: newStats };
        });
      },

      getUsageStats: (id: string): UsageStats | null => {
        return get().usageStats.get(id) ?? null;
      },

      updateConflicts: () => {
        const state = get();
        const allShortcuts: Shortcut[] = [
          ...Object.values(state.shortcuts.default),
          ...Object.values(state.shortcuts.custom || {}),
        ];

        const conflicts: ShortcutConflict[] = [];

        for (let i = 0; i < allShortcuts.length; i++) {
          for (let j = i + 1; j < allShortcuts.length; j++) {
            const s1 = allShortcuts[i];
            const s2 = allShortcuts[j];

            if (hasShortcutConflict(s1, s2)) {
              conflicts.push({
                id1: s1.id,
                id2: s2.id,
                key: s1.key,
                modifiers: s1.modifiers,
              });
            }
          }
        }

        set({ conflicts });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        shortcuts: {
          default: state.shortcuts.default,
          custom: state.shortcuts.custom,
        },
      }),
    }
  )
);

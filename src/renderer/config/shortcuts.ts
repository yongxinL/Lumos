import type { Shortcut, ShortcutCategory } from '../types/shortcuts';

/**
 * Global keyboard shortcuts configuration for Lumos
 * Follows macOS HIG conventions
 */

export const SHORTCUTS: Record<string, Shortcut> = {
  // Global shortcuts
  commandPalette: {
    id: 'command-palette',
    key: 'k',
    modifiers: ['meta'],
    description: 'Open command palette',
    category: 'Global',
    platform: 'all',
  },
  shortcuts: {
    id: 'shortcuts-help',
    key: '/',
    modifiers: ['meta'],
    description: 'Show keyboard shortcuts',
    category: 'Global',
    platform: 'all',
  },

  // Navigation shortcuts (Cmd+1-5)
  navChat: {
    id: 'nav-chat',
    key: '1',
    modifiers: ['meta'],
    description: 'Go to Chat',
    category: 'Navigation',
    platform: 'all',
  },
  navActivity: {
    id: 'nav-activity',
    key: '2',
    modifiers: ['meta'],
    description: 'Go to Activity',
    category: 'Navigation',
    platform: 'all',
  },
  navPermissions: {
    id: 'nav-permissions',
    key: '3',
    modifiers: ['meta'],
    description: 'Go to Permissions',
    category: 'Navigation',
    platform: 'all',
  },
  navSkills: {
    id: 'nav-skills',
    key: '4',
    modifiers: ['meta'],
    description: 'Go to Skills',
    category: 'Navigation',
    platform: 'all',
  },
  navSettings: {
    id: 'nav-settings',
    key: '5',
    modifiers: ['meta'],
    description: 'Go to Settings',
    category: 'Navigation',
    platform: 'all',
  },

  // Action shortcuts
  submit: {
    id: 'action-submit',
    key: 'Enter',
    modifiers: [],
    description: 'Submit form',
    category: 'Actions',
    platform: 'all',
  },
  cancel: {
    id: 'action-cancel',
    key: 'Escape',
    modifiers: [],
    description: 'Cancel/Close',
    category: 'Actions',
    platform: 'all',
  },

  // macOS standard shortcuts
  undo: {
    id: 'edit-undo',
    key: 'z',
    modifiers: ['meta'],
    description: 'Undo',
    category: 'Edit',
    platform: 'mac',
  },
  redo: {
    id: 'edit-redo',
    key: 'z',
    modifiers: ['meta', 'shift'],
    description: 'Redo',
    category: 'Edit',
    platform: 'mac',
  },
  copy: {
    id: 'edit-copy',
    key: 'c',
    modifiers: ['meta'],
    description: 'Copy',
    category: 'Edit',
    platform: 'mac',
  },
  paste: {
    id: 'edit-paste',
    key: 'v',
    modifiers: ['meta'],
    description: 'Paste',
    category: 'Edit',
    platform: 'mac',
  },
  selectAll: {
    id: 'edit-select-all',
    key: 'a',
    modifiers: ['meta'],
    description: 'Select All',
    category: 'Edit',
    platform: 'mac',
  },
  quit: {
    id: 'app-quit',
    key: 'q',
    modifiers: ['meta'],
    description: 'Quit Application',
    category: 'Application',
    platform: 'mac',
  },
};

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(category: ShortcutCategory): Shortcut[] {
  return Object.values(SHORTCUTS).filter((s) => s.category === category);
}

/**
 * Get all available categories
 */
export function getShortcutCategories(): ShortcutCategory[] {
  const categories = new Set<ShortcutCategory>();
  Object.values(SHORTCUTS).forEach((s) => categories.add(s.category));
  return Array.from(categories).sort();
}

/**
 * Check if two shortcuts conflict
 */
export function hasShortcutConflict(s1: Shortcut, s2: Shortcut): boolean {
  if (s1.id === s2.id) return false;
  if (s1.key !== s2.key) return false;
  if (s1.modifiers.length !== s2.modifiers.length) return false;

  const mods1 = new Set(s1.modifiers.sort());
  const mods2 = new Set(s2.modifiers.sort());

  return Array.from(mods1).every((m) => mods2.has(m));
}

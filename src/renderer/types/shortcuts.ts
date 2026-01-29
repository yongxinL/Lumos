/**
 * Type definitions for keyboard shortcuts system
 */

export type ShortcutCategory =
  | 'Global'
  | 'Navigation'
  | 'Actions'
  | 'Edit'
  | 'Application'
  | 'Custom';

export type ShortcutPlatform = 'all' | 'mac' | 'windows' | 'linux';

export type Modifier = 'meta' | 'ctrl' | 'alt' | 'shift';

export type ShortcutHandler = () => void;

export interface Shortcut {
  id: string;
  key: string;
  modifiers: Modifier[];
  description: string;
  category: ShortcutCategory;
  platform: ShortcutPlatform;
  handler?: () => void;
  conflictsWith?: string[];
}

export interface ShortcutConfig extends Shortcut {
  customizable?: boolean;
  enabled?: boolean;
}

export interface ShortcutStore {
  shortcuts: ShortcutRegistry;
  addCustomShortcut(config: ShortcutConfig): void;
  removeCustomShortcut(id: string): void;
  updateShortcut(id: string, config: Partial<ShortcutConfig>): void;
  hasConflict(id: string): boolean;
  recordUsage(id: string): void;
  getUsageStats(id: string): UsageStats | null;
}

export interface ShortcutRegistry {
  default: Record<string, Shortcut>;
  custom?: Record<string, ShortcutConfig>;
}

export interface UsageStats {
  count: number;
  lastUsed: Date;
}

export interface ShortcutConflict {
  id1: string;
  id2: string;
  key: string;
  modifiers: Modifier[];
}

export interface ShortcutsHelpState {
  isOpen: boolean;
  selectedCategory?: ShortcutCategory;
}

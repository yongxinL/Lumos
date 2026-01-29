import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShortcutStore } from '../store/shortcutStore';

/**
 * Hook for managing global keyboard shortcuts
 * Handles command palette, navigation, actions, and custom shortcuts
 */
export function useKeyboardShortcuts(onCommandPalette?: () => void) {
  const navigate = useNavigate();
  const { shortcuts, hasConflict, recordUsage } = useShortcutStore();

  // Navigation shortcuts
  const handleNavigation = useCallback(
    (key: string) => {
      const routes = ['/chat', '/activity', '/permissions', '/skills', '/settings'];
      const index = parseInt(key) - 1;
      if (index >= 0 && index < routes.length) {
        navigate(routes[index]);
        recordUsage(`nav-${key}`);
      }
    },
    [navigate, recordUsage]
  );

  // Command palette shortcut
  const handleCommandPalette = useCallback(() => {
    onCommandPalette?.();
    recordUsage('command-palette');
  }, [onCommandPalette, recordUsage]);

  // Main keyboard event handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      // Command palette: Cmd+K
      if (isMeta && e.key === 'k') {
        e.preventDefault();
        handleCommandPalette();
        return;
      }

      // Navigation: Cmd+1-5
      if (isMeta && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        handleNavigation(e.key);
        return;
      }

      // Help modal: Cmd+/
      if (isMeta && e.key === '/') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('show-shortcuts-help', { detail: { shortcuts } }));
        recordUsage('shortcuts-help');
        return;
      }

      // Check for custom shortcuts
      const customShortcut = Object.entries(shortcuts.custom || {}).find(([_, config]) => {
        const keyMatches = config.key === e.key;
        const modifiersMatch = matchModifiers(e, config.modifiers || []);
        return keyMatches && modifiersMatch;
      });

      if (customShortcut) {
        const [id, config] = customShortcut;
        if (config.handler && !hasConflict(id)) {
          e.preventDefault();
          config.handler();
          recordUsage(id);
        }
      }
    },
    [handleCommandPalette, handleNavigation, shortcuts, hasConflict, recordUsage]
  );

  // Set up and cleanup event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Helper function to match modifier keys
 */
function matchModifiers(e: KeyboardEvent, modifiers: string[]): boolean {
  const requiredMods = new Set(modifiers);
  const activeMods = new Set<string>();

  if (e.ctrlKey) activeMods.add('ctrl');
  if (e.metaKey) activeMods.add('meta');
  if (e.altKey) activeMods.add('alt');
  if (e.shiftKey) activeMods.add('shift');

  // Check if all required modifiers are present
  for (const mod of requiredMods) {
    if (!activeMods.has(mod)) return false;
  }

  return true;
}

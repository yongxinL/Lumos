import React, { useState, useEffect } from 'react';
import { useShortcutStore } from '../store/shortcutStore';
import { getShortcutsByCategory, getShortcutCategories } from '../config/shortcuts';
import type { ShortcutCategory } from '../types/shortcuts';
import styles from './ShortcutsHelpModal.module.css';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component for displaying keyboard shortcuts help
 * Shows shortcuts organized by category with conflict warnings
 */
export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | null>(null);
  const { conflicts } = useShortcutStore();

  useEffect(() => {
    const handleShowHelp = (event: Event) => {
      if (event instanceof CustomEvent) {
        setSelectedCategory(null);
      }
    };

    if (isOpen) {
      window.addEventListener('show-shortcuts-help', handleShowHelp);
      return () => window.removeEventListener('show-shortcuts-help', handleShowHelp);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = getShortcutCategories();
  const displayCategory = selectedCategory || 'Global';
  const categoryShortcuts = getShortcutsByCategory(displayCategory as ShortcutCategory);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Keyboard Shortcuts</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {/* Categories sidebar */}
          <div className={styles.sidebar}>
            <h3>Categories</h3>
            <ul className={styles.categoryList}>
              {categories.map((category) => (
                <li key={category}>
                  <button
                    className={`${styles.categoryButton} ${
                      selectedCategory === category ? styles.active : ''
                    }`}
                    onClick={() => setSelectedCategory(category as ShortcutCategory)}
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Shortcuts display */}
          <div className={styles.shortcuts}>
            <h3>{displayCategory}</h3>
            <div className={styles.shortcutList}>
              {categoryShortcuts.length > 0 ? (
                categoryShortcuts.map((shortcut) => {
                  const hasConflict = conflicts.some(
                    (c) => c.id1 === shortcut.id || c.id2 === shortcut.id
                  );

                  return (
                    <div
                      key={shortcut.id}
                      className={`${styles.shortcutItem} ${hasConflict ? styles.conflicted : ''}`}
                    >
                      <div className={styles.description}>{shortcut.description}</div>
                      <div className={styles.keys}>
                        {shortcut.modifiers.map((mod) => (
                          <kbd key={mod} className={styles.key}>
                            {formatModifier(mod)}
                          </kbd>
                        ))}
                        <kbd className={styles.key}>{shortcut.key}</kbd>
                      </div>
                      {hasConflict && (
                        <div className={styles.conflictWarning}>⚠ Conflict detected</div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className={styles.empty}>No shortcuts in this category</p>
              )}
            </div>

            {/* Conflicts section */}
            {conflicts.length > 0 && (
              <div className={styles.conflictsSection}>
                <h4>Active Conflicts</h4>
                <ul className={styles.conflictsList}>
                  {conflicts.map((conflict) => (
                    <li key={`${conflict.id1}-${conflict.id2}`}>
                      <code>
                        {conflict.modifiers.map((m) => formatModifier(m)).join(' + ')} +{' '}
                        {conflict.key}
                      </code>{' '}
                      conflicts between shortcuts
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <p>
            Press <kbd>Cmd</kbd> + <kbd>/</kbd> to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  );
};

function formatModifier(mod: string): string {
  const modMap: Record<string, string> = {
    meta: '⌘',
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
  };
  return modMap[mod] || mod;
}

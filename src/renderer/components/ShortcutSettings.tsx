import React, { useState } from 'react';
import { useShortcutStore } from '../store/shortcutStore';
import { getShortcutsByCategory, getShortcutCategories } from '../config/shortcuts';
import type { ShortcutConfig, Modifier } from '../types/shortcuts';
import styles from './ShortcutSettings.module.css';

/**
 * Component for managing and customizing keyboard shortcuts
 * Allows users to view, modify, and reset shortcuts
 */
export const ShortcutSettings: React.FC = () => {
  const { shortcuts, updateShortcut, removeCustomShortcut, conflicts } = useShortcutStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recording, setRecording] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<{ key: string; modifiers: Modifier[] }>({
    key: '',
    modifiers: [],
  });

  const categories = getShortcutCategories();

  // Handle key recording for shortcut customization
  const handleStartRecording = (shortcutId: string) => {
    setRecording(shortcutId);
    setRecordedKeys({ key: '', modifiers: [] });
  };

  const handleKeyRecording = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!recording) return;

    e.preventDefault();

    const modifiers: Modifier[] = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.metaKey) modifiers.push('meta');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');

    // Ignore pure modifier keys
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
      return;
    }

    setRecordedKeys({
      key: e.key,
      modifiers,
    });
  };

  const handleSaveCustomShortcut = () => {
    if (!recording || !recordedKeys.key) return;

    const currentShortcut = shortcuts.default[recording] || shortcuts.custom?.[recording];
    if (!currentShortcut) return;

    const updated: ShortcutConfig = {
      ...currentShortcut,
      key: recordedKeys.key,
      modifiers: recordedKeys.modifiers,
      customizable: true,
    };

    updateShortcut(recording, updated);
    setRecording(null);
    setEditingId(null);
  };

  const handleResetShortcut = (id: string) => {
    const defaultShortcut = shortcuts.default[id];
    if (defaultShortcut) {
      updateShortcut(id, defaultShortcut);
    } else {
      removeCustomShortcut(id);
    }
  };

  const hasConflict = (id: string): boolean => {
    return conflicts.some((c) => c.id1 === id || c.id2 === id);
  };

  return (
    <div className={styles.container}>
      <h2>Keyboard Shortcuts</h2>
      <p className={styles.description}>
        Customize keyboard shortcuts for faster navigation and actions. Conflicts are highlighted in
        orange.
      </p>

      {categories.map((category) => {
        const categoryShortcuts = getShortcutsByCategory(category);
        return (
          <div key={category} className={styles.category}>
            <h3>{category}</h3>
            <div className={styles.shortcutsList}>
              {categoryShortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className={`${styles.shortcutItem} ${
                    hasConflict(shortcut.id) ? styles.conflicted : ''
                  } ${editingId === shortcut.id ? styles.editing : ''}`}
                >
                  <div className={styles.shortcutInfo}>
                    <div className={styles.description}>{shortcut.description}</div>
                    <div className={styles.meta}>
                      {shortcut.platform !== 'all' && (
                        <span className={styles.platform}>{shortcut.platform}</span>
                      )}
                      {hasConflict(shortcut.id) && (
                        <span className={styles.conflict}>⚠ Conflict</span>
                      )}
                    </div>
                  </div>

                  {editingId === shortcut.id ? (
                    <div
                      className={styles.recordingArea}
                      onKeyDown={handleKeyRecording}
                      tabIndex={0}
                      role="textbox"
                      aria-label="Press keys to record shortcut"
                    >
                      {recording === shortcut.id ? (
                        <div className={styles.recordingState}>
                          <div className={styles.recordingIndicator}>●</div>
                          <span>Press keys...</span>
                          {recordedKeys.key && (
                            <div className={styles.previewKeys}>
                              {recordedKeys.modifiers.map((m) => (
                                <kbd key={m}>{formatModifier(m)}</kbd>
                              ))}
                              <kbd>{recordedKeys.key}</kbd>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          className={styles.recordButton}
                          onClick={() => handleStartRecording(shortcut.id)}
                        >
                          Record
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={styles.currentKeys}>
                      {shortcut.modifiers.map((mod) => (
                        <kbd key={mod}>{formatModifier(mod)}</kbd>
                      ))}
                      <kbd>{shortcut.key}</kbd>
                    </div>
                  )}

                  <div className={styles.actions}>
                    {editingId === shortcut.id ? (
                      <>
                        <button
                          className={styles.saveButton}
                          onClick={handleSaveCustomShortcut}
                          disabled={!recordedKeys.key}
                        >
                          Save
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={() => {
                            setEditingId(null);
                            setRecording(null);
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.editButton}
                          onClick={() => setEditingId(shortcut.id)}
                        >
                          Edit
                        </button>
                        {shortcuts.custom?.[shortcut.id] && (
                          <button
                            className={styles.resetButton}
                            onClick={() => handleResetShortcut(shortcut.id)}
                          >
                            Reset
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {conflicts.length > 0 && (
        <div className={styles.conflictsWarning}>
          <h3>Active Conflicts</h3>
          <p>
            The following shortcuts have conflicts and may not work as expected. Please resolve them
            by editing one of the conflicting shortcuts.
          </p>
          <ul>
            {conflicts.map((conflict) => (
              <li key={`${conflict.id1}-${conflict.id2}`}>
                <strong>
                  {conflict.modifiers.map((m) => formatModifier(m)).join(' + ')} + {conflict.key}
                </strong>{' '}
                is used by multiple shortcuts
              </li>
            ))}
          </ul>
        </div>
      )}
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

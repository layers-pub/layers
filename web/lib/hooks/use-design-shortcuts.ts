'use client';

/**
 * Keyboard shortcut hook for the design section editors.
 *
 * Registers Ctrl+S / Cmd+S (save), Escape (cancel), and
 * Ctrl+N / Cmd+N (new item) handlers. Shortcuts are disabled
 * when a textarea or input with type="text" is focused, except
 * for save (Ctrl+S) which always fires to prevent browser save.
 *
 * @module
 */

import { useEffect, useCallback } from 'react';

interface UseDesignShortcutsOptions {
  /** Called on Ctrl+S / Cmd+S. Prevents default browser save dialog. */
  readonly onSave?: () => void;
  /** Called on Escape. */
  readonly onCancel?: () => void;
  /** Called on Ctrl+N / Cmd+N. Prevents default browser new window. */
  readonly onNew?: () => void;
  /** Whether the shortcuts are active. Defaults to true. */
  readonly enabled?: boolean;
}

/**
 * Returns true if the active element is a text input, textarea, or
 * contentEditable, meaning general shortcuts should be suppressed.
 */
function isTextInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;

  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT') {
    const inputEl = el as HTMLInputElement;
    const textTypes = new Set(['text', 'search', 'url', 'email', 'password', 'tel', 'number']);
    return textTypes.has(inputEl.type);
  }
  if ((el as HTMLElement).isContentEditable) return true;

  return false;
}

function useDesignShortcuts({
  onSave,
  onCancel,
  onNew,
  enabled = true,
}: UseDesignShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMod = event.metaKey || event.ctrlKey;

      // Ctrl+S / Cmd+S: Save (always fire, even in text inputs)
      if (isMod && event.key === 's') {
        event.preventDefault();
        onSave?.();
        return;
      }

      // Escape: Cancel / close dialogs
      if (event.key === 'Escape') {
        onCancel?.();
        return;
      }

      // Ctrl+N / Cmd+N: New item (skip when in text inputs)
      if (isMod && event.key === 'n') {
        if (isTextInputFocused()) return;
        event.preventDefault();
        onNew?.();
        return;
      }
    },
    [enabled, onSave, onCancel, onNew],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

export { useDesignShortcuts };
export type { UseDesignShortcutsOptions };

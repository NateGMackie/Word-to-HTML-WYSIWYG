// src/ux/hotkeys.js
export function initHotkeys({ setActiveView, wysiwygCommand }) {
  window.addEventListener('keydown', (e) => {
    // Alt+1/2/3 → switch views
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (e.key === '1') {
        e.preventDefault();
        setActiveView('wysiwyg');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveView('html');
      } else if (e.key === '3') {
        e.preventDefault();
        setActiveView('word');
      }
    }

    // WYSIWYG shortcuts (only when focus is in editor)
    const active = document.activeElement;
    const inEditor =
      active && (active.id === 'wysiwyg' || active.closest?.('#wysiwyg'));

    if (!inEditor) return;

    if (e.metaKey || e.ctrlKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        wysiwygCommand('bold');
      } else if (k === 'i') {
        e.preventDefault();
        wysiwygCommand('italic');
      } else if (k === 'u') {
        e.preventDefault();
        wysiwygCommand('underline');
      }
    }
  });
}

// src/services/docState.js
export function createDocState({ htmlEditor, wysiwyg, statBytes, statWords }) {
  let cleanHTML = '';

  function coerceHtml(value) {
  // Most common case
  if (typeof value === 'string') return value;

  // Common "cleaner returns an object" shapes
  if (value && typeof value === 'object') {
    if (typeof value.cleanHtml === 'string') return value.cleanHtml;
    if (typeof value.cleanHTML === 'string') return value.cleanHTML;
    if (typeof value.html === 'string') return value.html;

    // DOM node / fragment cases
    if (typeof value.innerHTML === 'string') {
      return value.innerHTML;
    }

    // textContent is lossy — warn loudly if we ever fall back to it
    if (typeof value.textContent === 'string') {
      console.warn(
        'docState.coerceHtml received DOM node without innerHTML; using textContent (markup will be lost):',
        value
      );
      return value.textContent;
    }
  }

  // null/undefined/false -> empty
  if (value == null) return '';

  // Last resort: string conversion
  console.warn('docState.setCleanHtml received non-string value; coercing to string:', value);
  return String(value);
}


  function updateStats() {
    if (!statBytes || !statWords) return;

    const html = typeof cleanHTML === 'string' ? cleanHTML : coerceHtml(cleanHTML);

    const bytes = new Blob([html]).size;
    const words = (html.replace(/<[^>]*>/g, ' ').match(/\b\w+\b/g) || []).length;

    statBytes.textContent = bytes.toLocaleString();
    statWords.textContent = words.toLocaleString();
  }

  function getCleanHtml() {
    return typeof cleanHTML === 'string' ? cleanHTML : coerceHtml(cleanHTML);
  }

    let rev = 0;
  let lastFrom = 'system';
  let lastUpdatedAt = null;
  const listeners = new Set();

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    for (const fn of listeners) {
      try { fn({ rev, lastFrom, lastUpdatedAt, cleanHTML }); } catch {}
    }
  }

  function setCleanHtml(html, { from = 'system' } = {}) {
    cleanHTML = coerceHtml(html);

    rev += 1;
    lastFrom = from;
    lastUpdatedAt = new Date().toISOString();

    // Only push into the HTML textarea when change came from WYSIWYG
    if (htmlEditor && from === 'wysiwyg' && document.activeElement !== htmlEditor) {
      htmlEditor.value = cleanHTML;
    }

    updateStats();
    notify();
  }

  function getMeta() {
    return { rev, lastFrom, lastUpdatedAt };
  }

  return {
    setCleanHtml,
    getCleanHtml,
    updateStats,
    getMeta,
    subscribe,
  };

}

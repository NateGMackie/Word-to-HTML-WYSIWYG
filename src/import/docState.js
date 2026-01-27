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
      // (Node.ELEMENT_NODE etc. not always available depending on context, so keep it simple)
      if (typeof value.innerHTML === 'string') return value.innerHTML;
      if (typeof value.textContent === 'string') return value.textContent;
    }

    // null/undefined/false -> empty
    if (value == null) return '';

    // Last resort: string conversion
    // (Better than crashing, and we also warn so you can fix the source.)
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

  function setCleanHtml(html, { from = 'system' } = {}) {
    cleanHTML = coerceHtml(html);

    // Only push into the HTML textarea when the change came from WYSIWYG
    // AND the user is not actively typing in the HTML textarea.
    if (htmlEditor && from === 'wysiwyg' && document.activeElement !== htmlEditor) {
      htmlEditor.value = cleanHTML;
    }

    // IMPORTANT:
    // Do NOT do wysiwyg.innerHTML = cleanHTML here.
    // Lexical owns the WYSIWYG DOM. Touching it will cause focus/teardown issues.
    updateStats();
  }

  function getCleanHtml() {
    return cleanHTML;
  }

  return {
    setCleanHtml,
    getCleanHtml,
    updateStats,
  };
}

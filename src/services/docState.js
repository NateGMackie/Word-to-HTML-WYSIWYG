// src/services/docState.js
export function createDocState({ htmlEditor, wysiwyg, statBytes, statWords }) {
  let cleanHTML = '';

  function updateStats() {
    if (!statBytes || !statWords) return;
    const html = cleanHTML || '';
    const bytes = new Blob([html]).size;
    const words = (html.replace(/<[^>]*>/g, ' ').match(/\b\w+\b/g) || []).length;
    statBytes.textContent = bytes.toLocaleString();
    statWords.textContent = words.toLocaleString();
  }

   function setCleanHtml(html, { from = 'system' } = {}) {
  cleanHTML = html || '';

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

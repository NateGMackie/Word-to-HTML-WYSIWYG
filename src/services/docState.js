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

    if (from !== 'html' && htmlEditor) {
      htmlEditor.value = cleanHTML;
    }
    if (from !== 'wysiwyg' && wysiwyg) {
      wysiwyg.innerHTML = cleanHTML || '';
    }

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

// src/views/html.js
export function initHtmlView({ elements, docState }) {
  const { htmlEditor, btnFormatHtml } = elements;
  if (!htmlEditor) return;

  function prettyHtml(html) {
    try {
      const tab = '  ';
      let result = '';
      let indent = 0;

      html
        .replace(/>\s+</g, '><')
        .replace(/</g, '~::~<')
        .split('~::~')
        .forEach((node) => {
          if (/^<\//.test(node)) indent--;
          result += tab.repeat(Math.max(indent, 0)) + node + (/<\/?\w/.test(node) ? '\n' : '');
          if (/^<\w[^>]*[^\/]>/.test(node) && !node.includes('<!')) indent++;
        });

      return result.trim();
    } catch {
      return html;
    }
  }

  btnFormatHtml?.addEventListener('click', () => {
    const pretty = prettyHtml(htmlEditor.value);
    htmlEditor.value = pretty;
    docState.setCleanHtml(pretty, { from: 'html' });
  });

  htmlEditor.addEventListener('input', () => {
    docState.setCleanHtml(htmlEditor.value, { from: 'html' });
  });
}

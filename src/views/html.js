// src/views/html.js
export function initHtmlView({ elements, docState }) {
  const { htmlEditor, btnFormatHtml } = elements;
  if (!htmlEditor) return;

  function prettyHtml(html) {
  try {
    const VOID_TAGS = new Set([
      'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr',
    ]);

    const tab = '  ';
    const tpl = document.createElement('template');
    tpl.innerHTML = (html || '').trim();

    function escapeText(s) {
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function attrsToString(el) {
      if (!el.attributes || el.attributes.length === 0) return '';
      const parts = [];
      for (const attr of el.attributes) {
        // preserve attribute casing and values
        parts.push(`${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`);
      }
      return ' ' + parts.join(' ');
    }

    function formatNode(node, depth) {
      // Element
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const attrs = attrsToString(node);

        // Void element: <col>, <br>, <hr>, etc.
        if (VOID_TAGS.has(tag)) {
          return `${tab.repeat(depth)}<${tag}${attrs}>\n`;
        }

        // No children
        if (!node.firstChild) {
          return `${tab.repeat(depth)}<${tag}${attrs}></${tag}>\n`;
        }

        // If it’s exactly one <br> inside (common for empty paragraphs), keep compact
        if (
          node.childNodes.length === 1 &&
          node.firstChild.nodeType === Node.ELEMENT_NODE &&
          node.firstChild.tagName.toLowerCase() === 'br'
        ) {
          return `${tab.repeat(depth)}<${tag}${attrs}><br></${tag}>\n`;
        }

        // Otherwise, multi-line block
        let out = `${tab.repeat(depth)}<${tag}${attrs}>\n`;
        for (const child of node.childNodes) {
          out += formatNode(child, depth + 1);
        }
        out += `${tab.repeat(depth)}</${tag}>\n`;
        return out;
      }

      // Text
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue.replace(/\s+/g, ' ').trim();
        if (!text) return '';
        return `${tab.repeat(depth)}${escapeText(text)}\n`;
      }

      // Comment
      if (node.nodeType === Node.COMMENT_NODE) {
        const text = (node.nodeValue || '').trim();
        return `${tab.repeat(depth)}<!-- ${text} -->\n`;
      }

      return '';
    }

    let result = '';
    for (const child of tpl.content.childNodes) {
      result += formatNode(child, 0);
    }

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

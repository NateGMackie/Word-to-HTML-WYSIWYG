// src/utils/prettyHtml.js
export function prettyHtml(html) {
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
        parts.push(`${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`);
      }
      return ' ' + parts.join(' ');
    }

    function formatNode(node, depth) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const attrs = attrsToString(node);

        if (VOID_TAGS.has(tag)) {
          return `${tab.repeat(depth)}<${tag}${attrs}>\n`;
        }

        if (!node.firstChild) {
          return `${tab.repeat(depth)}<${tag}${attrs}></${tag}>\n`;
        }

        if (
          node.childNodes.length === 1 &&
          node.firstChild.nodeType === Node.ELEMENT_NODE &&
          node.firstChild.tagName.toLowerCase() === 'br'
        ) {
          return `${tab.repeat(depth)}<${tag}${attrs}><br></${tag}>\n`;
        }

        let out = `${tab.repeat(depth)}<${tag}${attrs}>\n`;
        for (const child of node.childNodes) out += formatNode(child, depth + 1);
        out += `${tab.repeat(depth)}</${tag}>\n`;
        return out;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue.replace(/\s+/g, ' ').trim();
        if (!text) return '';
        return `${tab.repeat(depth)}${escapeText(text)}\n`;
      }

      if (node.nodeType === Node.COMMENT_NODE) {
        const text = (node.nodeValue || '').trim();
        return `${tab.repeat(depth)}<!-- ${text} -->\n`;
      }

      return '';
    }

    let result = '';
    for (const child of tpl.content.childNodes) result += formatNode(child, 0);
    return result.trim();
  } catch {
    return html;
  }
}

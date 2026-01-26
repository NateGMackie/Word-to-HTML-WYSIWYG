// src/views/html.js
import { cleanHTML } from '../import/htmlImport.js';

export function initHtmlView({ elements, docState, loadHtmlIntoEditor }) {
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


  // Create (or reuse) a small status line right under the Update button
function getStatusEl() {
  let el = document.getElementById('htmlApplyStatus');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'htmlApplyStatus';
  el.setAttribute('role', 'status');
  el.style.marginTop = '8px';
  el.style.fontSize = '12px';
  el.style.opacity = '0.9';

  // Insert after the button if possible; otherwise append after the editor.
  if (btnFormatHtml?.parentElement) {
    btnFormatHtml.parentElement.appendChild(el);
  } else {
    htmlEditor?.insertAdjacentElement('afterend', el);
  }
  return el;
}

function setStatus(message, kind = 'info') {
  const el = getStatusEl();
  el.textContent = message;

  // minimal styling without requiring CSS changes
  if (kind === 'error') {
    el.style.color = 'crimson';
  } else if (kind === 'warn') {
    el.style.color = 'darkgoldenrod';
  } else {
    el.style.color = '';
  }
}

btnFormatHtml?.addEventListener('click', () => {
  const input = (htmlEditor.value || '').trim();

  try {
    // 1) Compile: sanitize/normalize + enforce contract-ish structure
    const { html, report } = cleanHTML(input);

    // 2) Pretty print for readability (prettyHtml already has its own try/catch)
    const pretty = prettyHtml(html);

    // 3) Save canonical HTML back to state + textbox
    htmlEditor.value = pretty;
    docState.setCleanHtml(pretty, { from: 'html' });

    // 4) Apply once, intentionally (no live import)
    loadHtmlIntoEditor?.(pretty);

    // Status / validation messaging (Stage 5: violations flagged)
const removed = report?.removedTags ? Array.from(report.removedTags) : [];
const normalized = report?.normalized || [];

if (removed.length || normalized.length) {
  const bits = [];
  if (removed.length) bits.push(`Removed tags: ${removed.join(', ')}`);
  if (normalized.length) bits.push(`Normalized: ${normalized.join(', ')}`);
  setStatus(`Applied with changes. ${bits.join(' • ')}`, 'warn');
} else {
  setStatus('Applied. No contract violations detected.', 'info');
}

  } catch (err) {
    console.error('HTML Apply failed:', err);
    setStatus(`Could not apply HTML. Fix the markup and try again. (${err?.message || 'Unknown error'})`, 'error');
    // Do NOT throw — this is how we meet “Invalid HTML does not crash editor”
  }
});




  htmlEditor.addEventListener('input', () => {
  const html = htmlEditor.value;
  docState.setCleanHtml(html, { from: 'html' });
  // no live import
});

}

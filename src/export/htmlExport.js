// src/export/htmlExport.js
import { $generateHtmlFromNodes } from '@lexical/html';

/**
 * Export Lexical editor content to clean, contract-friendly HTML.
 * - Does NOT prettify (that’s the HTML panel’s job).
 * - Does normalize a few semantics so we don’t bake quirks into downstream HTML.
 */
export function exportHtmlFromEditor(editor) {
  const rawHtml = $generateHtmlFromNodes(editor);
  return cleanAndNormalizeExportHtml(rawHtml);
}

export function cleanAndNormalizeExportHtml(rawHtml) {
  let html = rawHtml || '';

  // 1) Remove any w2h-* classes but keep other classes
  html = html.replace(/\sclass="([^"]*)"/g, (match, classValue) => {
    const kept = classValue
      .split(/\s+/)
      .filter((name) => name && !name.startsWith('w2h-'));

    return kept.length ? ` class="${kept.join(' ')}"` : '';
  });

  // 2) Collapse <b><strong>…</strong></b> → <strong>…</strong>
  html = html.replace(
    /<b>\s*(<strong\b[^>]*>[\s\S]*?<\/strong>)\s*<\/b>/gi,
    '$1',
  );

  // 3) Collapse <i><em>…</em></i> → <em>…</em>
  html = html.replace(
    /<i>\s*(<em\b[^>]*>[\s\S]*?<\/em>)\s*<\/i>/gi,
    '$1',
  );

  // 4) Remove value="…" from <li>
  html = html.replace(/\svalue="[\d]+"/g, '');

  // 5) Flatten <sub><span>text</span></sub> → <sub>text</sub>
  html = html.replace(
    /<sub\b([^>]*)>\s*<span\b[^>]*>([\s\S]*?)<\/span>\s*<\/sub>/gi,
    '<sub$1>$2</sub>',
  );

  // 6) Flatten <sup><span>text</span></sup> → <sup>text</sup>
  html = html.replace(
    /<sup\b([^>]*)>\s*<span\b[^>]*>([\s\S]*?)<\/span>\s*<\/sup>/gi,
    '<sup$1>$2</sup>',
  );

  // 7) Remove white-space: pre-wrap styles that Lexical often injects
  html = html.replace(/\sstyle="white-space:\s*pre-wrap;?"/gi, '');

  // 8) Unwrap spans used only for pre-wrap on plain text (safe-ish)
  html = html.replace(
    /<span style="white-space:\s*pre-wrap;">([^<]*)<\/span>/gi,
    '$1',
  );

  // ---- Semantic normalizations (export-grade, not just "pretty") ----
  html = normalizeBlockquoteToParagraph(html);
  html = normalizePreToPreCode(html);
  html = normalizeOrphanNestedLists(html);
  html = unwrapRedundantSpans(html);

  return html;
}

/**
 * Ensure <blockquote> has block children when it’s just plain text:
 * <blockquote>Quote</blockquote> -> <blockquote><p>Quote</p></blockquote>
 */
function normalizeBlockquoteToParagraph(html) {
  return html.replace(
    /<blockquote\b([^>]*)>\s*([^<][\s\S]*?)\s*<\/blockquote>/gi,
    (_m, attrs, inner) => `<blockquote${attrs}><p>${inner.trim()}</p></blockquote>`,
  );
}

/**
 * Ensure code blocks use <pre><code>…</code></pre>.
 * Keeps existing attributes on <pre>.
 */
function normalizePreToPreCode(html) {
  // If <pre> already contains <code>, leave it alone.
  return html.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi, (m, attrs, inner) => {
    const trimmed = inner.trim();

    // already has <code ...> as first element
    if (/^<code\b/i.test(trimmed)) return `<pre${attrs}>${inner}</pre>`;

    // Wrap existing content in <code>
    return `<pre${attrs}><code>${trimmed}</code></pre>`;
  });
}

/**
 * Fix the “empty nesting bullet” pattern:
 * <li><ul>...</ul></li> should generally be attached under the previous <li>.
 *
 * This is hard to do perfectly with regex, but we can safely fix the common
 * export shape you showed (a <li> whose only element child is a nested list).
 */
function normalizeOrphanNestedLists(html) {
  // Use DOM so we don’t play regex roulette with nested tags.
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;

    tpl.content.querySelectorAll('ul,ol').forEach((list) => {
      fixOrphanNestedLists(list);
    });

    return tpl.innerHTML;
  } catch {
    return html;
  }

  function fixOrphanNestedLists(listEl) {
    const items = Array.from(listEl.children).filter((n) => n.tagName?.toLowerCase() === 'li');

    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      const elementKids = Array.from(li.children);
      if (elementKids.length !== 1) continue;

      const onlyChild = elementKids[0];
      const onlyTag = onlyChild.tagName?.toLowerCase();
      if (onlyTag !== 'ul' && onlyTag !== 'ol') continue;

      // If LI has no meaningful text beyond nested list text, treat as orphan wrapper
      const liText = (li.textContent || '').replace(/\s+/g, ' ').trim();
      const nestedText = (onlyChild.textContent || '').replace(/\s+/g, ' ').trim();
      const hasOwnText = liText && liText !== nestedText;
      if (hasOwnText) continue;

      const prev = items[i - 1];
      if (!prev) continue;

      prev.appendChild(onlyChild);
      li.remove();

      // restart after mutation
      return fixOrphanNestedLists(listEl);
    }

    // recurse
    Array.from(listEl.children).forEach((li) => {
      if (li.tagName?.toLowerCase() !== 'li') return;
      Array.from(li.children).forEach((kid) => {
        const t = kid.tagName?.toLowerCase();
        if (t === 'ul' || t === 'ol') fixOrphanNestedLists(kid);
      });
    });
  }
}

function unwrapRedundantSpans(html) {
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;

    // Remove empty spans (including whitespace-only)
    tpl.content.querySelectorAll('span').forEach((span) => {
      // Never touch spans inside code/pre (whitespace can matter)
      if (span.closest('pre, code')) return;

      const hasAttrs = span.attributes && span.attributes.length > 0;
      const text = (span.textContent || '').replace(/\u00A0/g, ' ').trim(); // nbsp -> space

      // Drop truly empty spans
      if (!hasAttrs && text === '' && span.children.length === 0) {
        span.remove();
        return;
      }

      // Unwrap spans that have NO attributes (pure wrappers)
      if (!hasAttrs) {
        const parent = span.parentNode;
        if (!parent) return;

        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        span.remove();
      }
    });

    return tpl.innerHTML;
  } catch {
    return html;
  }
}

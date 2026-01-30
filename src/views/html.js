// src/views/html.js
import { cleanHTML } from '../import/htmlImport.js';
import { prettyHtml } from '../utils/prettyHtml.js';

export function initHtmlView({ elements, docState, loadHtmlIntoEditor }) {
  const { htmlEditor, btnFormatHtml } = elements;
  if (!htmlEditor) return null;

  let dirty = false;
  let baseRev = docState.getMeta?.().rev ?? 0;

  function getStatusEl() {
    let el = document.getElementById('htmlApplyStatus');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'htmlApplyStatus';
    el.setAttribute('role', 'status');
    el.style.marginTop = '8px';
    el.style.fontSize = '12px';
    el.style.opacity = '0.9';

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

    if (kind === 'error') el.style.color = 'crimson';
    else if (kind === 'warn') el.style.color = 'darkgoldenrod';
    else el.style.color = '';
  }

  function clearStatus() {
    const el = document.getElementById('htmlApplyStatus');
    if (el) el.textContent = '';
  }

  function onEnter() {
    // HTML view always starts from canonical (last applied) HTML
    const canonical = docState.getCleanHtml?.() || '';
    htmlEditor.value = prettyHtml(canonical);

    dirty = false;
    baseRev = docState.getMeta?.().rev ?? baseRev;
    clearStatus();
  }

  function hasPendingEdits() {
    return !!dirty;
  }

  function showUsedLastAppliedMessage() {
    if (!dirty) return;
    setStatus(
      'Used last applied HTML. Click Update and try again to include pending edits.',
      'warn'
    );
  }

  btnFormatHtml?.addEventListener('click', () => {
    const input = (htmlEditor.value || '').trim();

    try {
      const { html, report } = cleanHTML(input);
      const pretty = prettyHtml(html);

      // Commit canonical
      docState.setCleanHtml(pretty, { from: 'html' });

      // Update buffer (what you see) and apply to editor
      htmlEditor.value = pretty;
      loadHtmlIntoEditor?.(pretty);

      dirty = false;
      baseRev = docState.getMeta?.().rev ?? baseRev;

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
      setStatus(
        `Could not apply HTML. Fix the markup and try again. (${err?.message || 'Unknown error'})`,
        'error'
      );
    }
  });

  htmlEditor.addEventListener('input', () => {
    dirty = true;

    // Optional divergence warning: canonical changed since you entered HTML view
    const nowRev = docState.getMeta?.().rev ?? baseRev;
    if (nowRev !== baseRev) {
      setStatus(
        'Edits not applied yet. (Note: the document changed since you entered HTML view.) Click Update to apply changes.',
        'warn'
      );
    } else {
      setStatus('Edits not applied yet. Click Update to apply changes.', 'warn');
    }
  });

  return {
    onEnter,
    hasPendingEdits,
    showUsedLastAppliedMessage,
    setStatus, // optional, but handy
  };
}

// src/views/wysiwyg.js
export function initWysiwygView({ elements, docState }) {
  const {
    wysiwyg,
    stylesSelect,
    btnScreenshot,
    btnNormalizeTable,
    btnUserInput,
    btnVariable,
    btnHr,
  } = elements;

  if (!wysiwyg) return;

  // ---- Inline normalization ----
  function normalizeInline() {
    wysiwyg.querySelectorAll('b').forEach((b) => {
      const s = document.createElement('strong');
      while (b.firstChild) s.appendChild(b.firstChild);
      b.replaceWith(s);
    });
    wysiwyg.querySelectorAll('i').forEach((i) => {
      const e = document.createElement('em');
      while (i.firstChild) e.appendChild(i.firstChild);
      i.replaceWith(e);
    });
  }

  function command(cmd, val = null) {
    document.execCommand(cmd, false, val);
    normalizeInline();
    docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
  }

  // ---- Block formatting / styles ----
  function setBlockFormat(tag) {
    if (tag === 'pre') {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const r = sel.getRangeAt(0);
      const pre = document.createElement('pre');
      pre.textContent = r.toString();
      r.deleteContents();
      r.insertNode(pre);
    } else if (tag === 'blockquote') {
      document.execCommand('formatBlock', false, 'blockquote');
    } else {
      const blockArg = `<${tag.toUpperCase()}>`;
      document.execCommand('formatBlock', false, blockArg);
    }
    docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
  }

  function findBlockAncestor(node) {
    while (
      node &&
      node !== wysiwyg &&
      !/^(P|DIV|LI|H1|H2|H3|H4|H5|H6|TD|TH|BLOCKQUOTE)$/.test(node.nodeName)
    ) {
      node = node.parentNode;
    }
    return node && node !== wysiwyg ? node : null;
  }

  function toggleCallout(cls) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;

    let block = findBlockAncestor(node);

    // If we don't have a sensible block, wrap one so we can style it.
    if (!block) {
      block = document.createElement('div');
      const r = sel.getRangeAt(0);
      r.surroundContents(block);
    } else if (!/^(P|DIV|LI|BLOCKQUOTE)$/.test(block.nodeName)) {
      const wrap = document.createElement('div');
      block.replaceWith(wrap);
      wrap.appendChild(block);
      block = wrap;
    }

    const classes = ['note', 'warning', 'example-block'];

    if (cls === 'remove') {
      classes.forEach((c) => block.classList.remove(c));

      // If this block is just a naked wrapper, unwrap it.
      if (
        (block.nodeName === 'DIV' || block.nodeName === 'P') &&
        !block.getAttributeNames().length &&
        !block.classList.length &&
        block.parentNode
      ) {
        while (block.firstChild) block.parentNode.insertBefore(block.firstChild, block);
        block.parentNode.removeChild(block);
      }
    } else {
      classes.forEach((c) => block.classList.remove(c));
      block.classList.add(cls);
    }

    docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
  }

  function applyScreenshot() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    const img = node.closest ? node.closest('img') : null;
    if (img) {
      img.classList.add('screenshot');
      docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
    }
  }

  function normalizeTable() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;

    const table = node.closest ? node.closest('table') : null;
    if (!table) return;

    // Remove attributes on table (except span attrs)
    [...table.attributes].forEach((a) => {
      if (!['rowspan', 'colspan'].includes(a.name)) table.removeAttribute(a.name);
    });

    if (table.getAttribute('style')) table.removeAttribute('style');

    table.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((a) => {
        if (!['rowspan', 'colspan'].includes(a.name)) el.removeAttribute(a.name);
      });
    });

    docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
  }

  function wrapUserInput() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const r = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'user-input';
    span.textContent = r.toString();
    r.deleteContents();
    r.insertNode(span);
    docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
  }

  function unwrapNode(el) {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  function wrapVariable() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    // No selection: prompt and insert a variable token at the caret
    if (sel.isCollapsed) {
      const name = prompt('Variable name (e.g., USERNAME):');
      if (!name) return;
      const span = document.createElement('span');
      span.className = 'variable';
      span.textContent = name;
      range.insertNode(span);

      const after = document.createRange();
      after.setStartAfter(span);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);

      docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
      return;
    }

    // Selection exists
    let container = range.commonAncestorContainer;
    if (container.nodeType === 3) container = container.parentNode;

    const existingVar = container.closest ? container.closest('span.variable') : null;
    if (existingVar && range.intersectsNode(existingVar)) {
      unwrapNode(existingVar);
      docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
      return;
    }

    const text = range.toString();
    const span = document.createElement('span');
    span.className = 'variable';
    span.textContent = text;

    range.deleteContents();
    range.insertNode(span);

    const after = document.createRange();
    after.setStartAfter(span);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);

    docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
  }

  // ---- Selection caching (for stylesSelect) ----
  let lastRange = null;

  function cacheRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      lastRange = sel.getRangeAt(0);
    }
  }

  function restoreRange() {
    if (!lastRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastRange);
  }

  wysiwyg.addEventListener('mouseup', cacheRange);
  wysiwyg.addEventListener('keyup', cacheRange);
  wysiwyg.addEventListener('mouseleave', cacheRange);

  // ---- Toolbar bindings (inline actions) ----
  const action = (name) =>
    document.querySelector(`[data-action="${name}"]`);

  action('bold')?.addEventListener('click', () => command('bold'));
  action('italic')?.addEventListener('click', () => command('italic'));
  action('underline')?.addEventListener('click', () => command('underline'));
  action('strikeThrough')?.addEventListener('click', () => command('strikeThrough'));
  action('subscript')?.addEventListener('click', () => command('subscript'));
  action('superscript')?.addEventListener('click', () => command('superscript'));
  action('link')?.addEventListener('click', () => {
    const url = prompt('Enter URL:');
    if (url) command('createLink', url);
  });
  action('unlink')?.addEventListener('click', () => command('unlink'));
  action('removeFormat')?.addEventListener('click', () => command('removeFormat'));

  // Lists / indent / alignment
  elements.btnUl?.addEventListener('click', () => command('insertUnorderedList'));
  elements.btnOl?.addEventListener('click', () => command('insertOrderedList'));
  elements.btnIndent?.addEventListener('click', () => command('indent'));
  elements.btnOutdent?.addEventListener('click', () => command('outdent'));
  elements.btnAlignLeft?.addEventListener('click', () => command('justifyLeft'));
  elements.btnAlignCenter?.addEventListener('click', () => command('justifyCenter'));
  elements.btnAlignRight?.addEventListener('click', () => command('justifyRight'));
  elements.btnAlignJustify?.addEventListener('click', () => command('justifyFull'));

  // Utilities
  btnScreenshot?.addEventListener('click', applyScreenshot);
  btnNormalizeTable?.addEventListener('click', normalizeTable);
  btnUserInput?.addEventListener('click', wrapUserInput);
  btnVariable?.addEventListener('click', wrapVariable);
  btnHr?.addEventListener('click', () => command('insertHorizontalRule'));

  // Styles dropdown
  stylesSelect?.addEventListener('change', (e) => {
    restoreRange();

    const v = e.target.value || '';
    if (!v) return;

    if (v.startsWith('block:')) {
      const tag = v.split(':')[1]; // p, h1, h2, h3, pre, blockquote
      setBlockFormat(tag);
    } else if (v.startsWith('callout:')) {
      const which = v.split(':')[1]; // note, warning, example-block, remove
      toggleCallout(which);
    }

    stylesSelect.selectedIndex = 0;
    wysiwyg.focus();
  });

  // Live sync from WYSIWYG typing
  wysiwyg.addEventListener('input', () =>
    docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' }),
  );
}

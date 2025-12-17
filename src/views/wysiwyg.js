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

  // Prefer <p> as the default block when pressing Enter (where supported)
  try {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  } catch (e) {
    // Some browsers ignore this; that's fine.
  }

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

  // ---- Block normalization ----
  function normalizeBlocks() {
    // Normalize top-level children of the wysiwyg root
    Array.from(wysiwyg.children).forEach((el) => {
      // Convert non-callout <div> blocks to <p>
      if (
        el.nodeName === 'DIV' &&
        !el.classList.contains('callout') // keep our callout containers as <div>
      ) {
        const p = document.createElement('p');
        while (el.firstChild) p.appendChild(el.firstChild);
        el.replaceWith(p);
      }
    });
  }

   function command(cmd, val = null) {
     document.execCommand(cmd, false, val);
     normalizeInline();
     normalizeBlocks();
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

      // Normalize: no <p> wrappers inside blockquotes
      wysiwyg.querySelectorAll('blockquote').forEach((bq) => {
        bq.querySelectorAll('p').forEach((p) => {
          unwrapNode(p);
        });
      });
    } else {
      const blockArg = `<${tag.toUpperCase()}>`;
      document.execCommand('formatBlock', false, blockArg);
    }

     normalizeBlocks();
     docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
  }

  // Enter handling:




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

    const range = sel.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;

    const CALLOUT_TYPES = ['note', 'warning', 'example-block'];

    // If we're already inside a callout, prefer to operate on that.
    const existingCallout =
      node.closest && node.closest('div.callout');

    // ---- Remove callout ----
    if (cls === 'remove') {
      if (!existingCallout) return;

      CALLOUT_TYPES.forEach((c) => existingCallout.classList.remove(c));

      const stillTyped = CALLOUT_TYPES.some((c) =>
        existingCallout.classList.contains(c),
      );

      // If it has no type left, unwrap the callout div entirely.
      if (!stillTyped) {
        unwrapNode(existingCallout);
      }

      docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
      return;
    }

    // ---- Add / change callout type ----
    let callout = existingCallout;

    // Helper: make sure a div.callout exists in the right place
    function ensureCalloutContainer() {
      if (callout) return callout;

      let block = findBlockAncestor(node);

      // Case A: selection inside an <li> → create a callout div inside the li
      if (block && block.nodeName === 'LI') {
        callout = document.createElement('div');
        callout.classList.add('callout');

        if (!sel.isCollapsed) {
          // Try to wrap the selected contents inside the li
          try {
            range.surroundContents(callout);
          } catch (e) {
            // Fallback: move the selected text into the callout
            callout.textContent = range.toString();
            range.deleteContents();
            block.appendChild(callout);
          }
        } else {
          // Collapsed selection: insert an empty callout for the user to type into
          block.appendChild(callout);
        }

        return callout;
      }

      // Case B: no useful block → wrap the selection directly
      if (!block || block === wysiwyg) {
        callout = document.createElement('div');
        callout.classList.add('callout');
        try {
          range.surroundContents(callout);
        } catch (e) {
          callout.textContent = range.toString();
          range.deleteContents();
          range.insertNode(callout);
        }
        return callout;
      }

      // Case C: normal block (P, BLOCKQUOTE, DIV, etc.) → wrap the whole block
      if (block.nodeName !== 'DIV' || !block.classList.contains('callout')) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('callout');
        block.replaceWith(wrapper);

        if (block.nodeName === 'P') {
          // Move the P's children directly into the callout and drop the P
          while (block.firstChild) {
            wrapper.appendChild(block.firstChild);
          }
          // P is now empty and detached
        } else {
          wrapper.appendChild(block);
        }

        callout = wrapper;
      } else {
        callout = block;
      }

      return callout;
    }

    // Ensure we have a callout container in the right place
    callout = ensureCalloutContainer();
    if (!callout) return;

    // Swap the type class
    CALLOUT_TYPES.forEach((c) => callout.classList.remove(c));
    callout.classList.add(cls);

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

  // Fix visual caret position in empty list items created by Enter
  wysiwyg.addEventListener('keyup', (e) => {
    if (e.key !== 'Enter') return;

    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;

    let node = sel.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    const li = node.closest && node.closest('li');
    if (!li) return;

    const html = li.innerHTML.trim();

    // Common empty-li shapes: "<br>" or "" (some browsers)
    if (html === '<br>' || html === '') {
      li.innerHTML = '\u200B'; // zero-width space

      // Put caret after the zero-width space
      const range = document.createRange();
      const textNode = li.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        range.setStart(textNode, textNode.textContent.length);
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  });


  // ---- Toolbar bindings (inline actions) ----
  const action = (name) =>
    document.querySelector(`[data-action="${name}"]`);

  action('bold')?.addEventListener('click', () => command('bold'));
  action('italic')?.addEventListener('click', () => command('italic'));
  action('underline')?.addEventListener('click', () => command('underline'));
  action('strikeThrough')?.addEventListener('click', () => command('strikeThrough'));
  action('subscript')?.addEventListener('click', () => command('subscript'));
  action('superscript')?.addEventListener('click', () => command('superscript'));
 // action('link')?.addEventListener('click', () => {
 //   const url = prompt('Enter URL:');
 //   if (url) command('createLink', url);
 // });
 // action('unlink')?.addEventListener('click', () => command('unlink'));
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
  // stylesSelect?.addEventListener('change', (e) => {
  // const v = e.target.value || '';
  // if (!v) return;

  // --- Block formats (p, h1, h2, h3, etc.) ---
  // Let Lexical's BlockFormatBridgePlugin handle these.
  // if (v.startsWith('block:')) {
    // Optionally reset the dropdown; Lexical also resets it.
  //   stylesSelect.selectedIndex = 0;
  //   return;
  // }

  // --- Callouts (note, warning, example, remove) ---
  // if (v.startsWith('callout:')) {
    // This is still using the old contenteditable implementation
    // until we move callouts into Lexical.
  //   restoreRange();

  //   const which = v.split(':')[1]; // note, warning, example-block, remove
  //   toggleCallout(which);

  //   stylesSelect.selectedIndex = 0;
  //   wysiwyg.focus();
 //  }
// });


  // Live sync from WYSIWYG typing
  wysiwyg.addEventListener('input', () => {
    normalizeInline();
    normalizeBlocks();
     docState.setCleanHtml(wysiwyg.innerHTML, { from: 'wysiwyg' });
  });
}

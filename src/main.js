// src/main.js
import { createDocState } from './services/docState.js';
import { initWordView } from './views/word.js';
import { initHtmlView } from './views/html.js';
import { initWysiwygView } from './views/wysiwyg.js';
import { initHotkeys } from './ux/hotkeys.js';

const $ = (id) => document.getElementById(id);

window.addEventListener('DOMContentLoaded', () => {
  // Core elements
  const wordInput = $('wordInput');
  const htmlEditor = $('htmlEditor');
  const wysiwyg = $('wysiwyg');

  const statBytes = $('statBytes');
  const statWords = $('statWords');
  const badgeActive = $('badgeActive');

  const btnCopy = $('btnCopy');
  const btnSave = $('btnSave');

  const btnPaste = $('btnPaste');
  const btnClean = $('btnClean');
  const btnClearAll = $('btnClearAll');
  const btnFormatHtml = $('btnFormatHtml');

  const toolsWord = $('toolsWord');
  const toolsHtml = $('toolsHtml');
  const toolsWysiwyg = $('toolsWysiwyg');

  const viewWord = $('viewWord');
  const viewHtml = $('viewHtml');
  const viewWysiwyg = $('viewWysiwyg');

  const navWord = $('navWord');
  const navHtml = $('navHtml');
  const navWysiwyg = $('navWysiwyg');

  const stylesSelect = $('stylesSelect');
  const btnScreenshot = $('btnScreenshot');
  const btnNormalizeTable = $('btnNormalizeTable');
  const btnUserInput = $('btnUserInput');
  const btnVariable = $('btnVariable');
  const btnHr = $('btnHr');

  const hiddenClipboard = $('hiddenClipboard');
  const exportCssTemplate = $('export-css');
  const cssForExport = exportCssTemplate ? exportCssTemplate.textContent.trim() : '';

  const btnUl = $('btnUl');
  const btnOl = $('btnOl');
  const btnIndent = $('btnIndent');
  const btnOutdent = $('btnOutdent');
  const btnAlignLeft = $('btnAlignLeft');
  const btnAlignCenter = $('btnAlignCenter');
  const btnAlignRight = $('btnAlignRight');
  const btnAlignJustify = $('btnAlignJustify');

  // ---- Document state ----
  const docState = createDocState({ htmlEditor, wysiwyg, statBytes, statWords });

  // ---- View switching ----
  let activeView = 'wysiwyg';

  function setActiveView(view) {
    activeView = view;

    // Panel visibility
    viewWord?.classList.toggle('hidden', view !== 'word');
    viewHtml?.classList.toggle('hidden', view !== 'html');
    viewWysiwyg?.classList.toggle('hidden', view !== 'wysiwyg');

    // Toolbar visibility
    toolsWord?.classList.toggle('hidden', view !== 'word');
    toolsHtml?.classList.toggle('hidden', view !== 'html');
    toolsWysiwyg?.classList.toggle('hidden', view !== 'wysiwyg');

    // Rail highlight
    ['navWord', 'navHtml', 'navWysiwyg'].forEach((id) => {
      const el = $(id);
      if (el) el.classList.remove('rail-active');
    });
    const map = { word: navWord, html: navHtml, wysiwyg: navWysiwyg };
    map[view]?.classList.add('rail-active');

    // Badge
    if (badgeActive) {
      const label = view === 'word' ? 'Word' : view === 'html' ? 'HTML' : 'WYSIWYG';
      badgeActive.textContent = `View: ${label}`;
    }
  }

  function getActiveView() {
    return activeView;
  }

  // ---- Clipboard & Save ----
  async function copyActive() {
    try {
      if (activeView === 'html') {
        await navigator.clipboard.writeText(htmlEditor.value);
      } else if (activeView === 'wysiwyg') {
        const html = wysiwyg.innerHTML;
        const data = [
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([html.replace(/<[^>]+>/g, '')], {
              type: 'text/plain',
            }),
          }),
        ];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(wordInput.innerHTML);
      }
    } catch {
      // Fallback for older browsers / blocked clipboard
      if (!hiddenClipboard) return;
      hiddenClipboard.value =
        activeView === 'html'
          ? htmlEditor.value
          : activeView === 'wysiwyg'
          ? wysiwyg.innerHTML
          : wordInput.innerHTML;
      hiddenClipboard.focus();
      hiddenClipboard.select();
      document.execCommand('copy');
    }
  }

  function saveFile() {
    const content = docState.getCleanHtml() || (wysiwyg?.innerHTML || '');
    const doc = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cleaned Content</title>
<style>${cssForExport}</style></head><body>${content}</body></html>`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([doc], { type: 'text/html;charset=utf-8' }),
    );
    a.download = 'clean-content.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  // ---- Views init ----
  const sharedElements = {
    wordInput,
    htmlEditor,
    wysiwyg,

    btnPaste,
    btnClean,
    btnClearAll,
    btnFormatHtml,

    btnUl,
    btnOl,
    btnIndent,
    btnOutdent,
    btnAlignLeft,
    btnAlignCenter,
    btnAlignRight,
    btnAlignJustify,

    stylesSelect,
    btnScreenshot,
    btnNormalizeTable,
    btnUserInput,
    btnVariable,
    btnHr,
  };

  initWordView({
    elements: sharedElements,
    docState,
    setActiveView,
  });

  initHtmlView({
    elements: sharedElements,
    docState,
  });

  initWysiwygView({
    elements: sharedElements,
    docState,
  });

  // ---- Navigation ----
  navWord?.addEventListener('click', () => setActiveView('word'));
  navHtml?.addEventListener('click', () => setActiveView('html'));
  navWysiwyg?.addEventListener('click', () => setActiveView('wysiwyg'));

  // ---- Global buttons ----
  btnCopy?.addEventListener('click', copyActive);
  btnSave?.addEventListener('click', saveFile);

  // ---- Hotkeys ----
  initHotkeys({
    setActiveView,
    wysiwygCommand: (cmdName) => {
      // Reuse the same toolbar wiring by "clicking" toolbar buttons
      const map = {
        bold: '[data-action="bold"]',
        italic: '[data-action="italic"]',
        underline: '[data-action="underline"]',
      };
      const sel = map[cmdName] && document.querySelector(map[cmdName]);
      sel?.click();
    },
  });

  // ---- Init state ----
  docState.setCleanHtml('', { from: 'system' });
  setActiveView('wysiwyg');
});

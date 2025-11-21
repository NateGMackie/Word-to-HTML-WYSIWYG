// src/main.js
import { createDocState } from './services/docState.js';
import { initWordView } from './views/word.js';
import { initHtmlView } from './views/html.js';
import { initWysiwygView } from './views/wysiwyg.js';
import { initHotkeys } from './ux/hotkeys.js';


import { mountWysiwygEditor } from './editor/mountWysiwyg.js';

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

  if (menuSave && btnSave && menuPanel) {
  menuSave.addEventListener('click', () => {
    btnSave.click();      // trigger your existing save logic
    menuPanel.classList.add('hidden'); // close menu
  });
}



const btnThemeToggle = document.getElementById('btnThemeToggle');
const body = document.body;

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const isDark = body.classList.toggle('theme-light'); 
    // If theme-light is ON, switch label
    btnThemeToggle.textContent = body.classList.contains('theme-light')
      ? 'LIGHT'
      : 'DARK';
  });
}

  const btnPaste = $('btnPaste');
  const btnClean = $('btnClean');

  const menuNew = document.getElementById('menuNew');
const btnClearAll = document.getElementById('btnClearAll');

if (menuNew && btnClearAll && menuPanel) {
  menuNew.addEventListener('click', () => {
    btnClearAll.click();          // reuse existing reset behavior
    menuPanel.classList.add('hidden');  // close the menu
  });
}

  const btnFormatHtml = $('btnFormatHtml');

  const toolsWord = $('toolsWord');
  const toolsHtml = $('toolsHtml');
  const toolsWysiwyg = $('toolsWysiwyg');

  initWysiwygToolbarBehavior(wysiwyg);


  const viewWord = $('viewWord');
  const viewHtml = $('viewHtml');
  const viewWysiwyg = $('viewWysiwyg');

  const navWord = $('navWord');
  const navHtml = $('navHtml');
  const navWysiwyg = $('navWysiwyg');

  if (btnMenu && menuPanel) {
  btnMenu.addEventListener('click', () => {
    menuPanel.classList.toggle('hidden');
  });
}

if (menuImport && navWord && menuPanel) {
  menuImport.addEventListener('click', () => {
    // Reuse existing logic for switching to Word view
    navWord.click();
    // Close the menu
    menuPanel.classList.add('hidden');
  });
}

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

function initWysiwygToolbarBehavior(editor) {
  if (!editor) return;

  const toolbar = document.getElementById('toolsWysiwyg');

  // Map the buttons we care about for "active" states
  const buttonMap = {
    bold: toolbar.querySelector('[data-action="bold"]'),
    italic: toolbar.querySelector('[data-action="italic"]'),
    underline: toolbar.querySelector('[data-action="underline"]'),
    strikeThrough: toolbar.querySelector('[data-action="strikeThrough"]'),
    subscript: toolbar.querySelector('[data-action="subscript"]'),
    superscript: toolbar.querySelector('[data-action="superscript"]'),

    ul: document.getElementById('btnUl'),
    ol: document.getElementById('btnOl'),

    alignLeft: document.getElementById('btnAlignLeft'),
    alignCenter: document.getElementById('btnAlignCenter'),
    alignRight: document.getElementById('btnAlignRight'),
    alignJustify: document.getElementById('btnAlignJustify'),
  };

  function clearActiveStates() {
    Object.values(buttonMap).forEach((btn) => {
      if (btn) btn.classList.remove('is-active');
    });
  }

  function updateToolbarState() {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) {
      clearActiveStates();
      return;
    }

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // If the selection is outside the editor, clear states
    if (!editor.contains(container)) {
      clearActiveStates();
      return;
    }

    // Inline styles: use queryCommandState (works well if you're using execCommand)
    const inlineStates = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      subscript: document.queryCommandState('subscript'),
      superscript: document.queryCommandState('superscript'),
    };

    Object.entries(inlineStates).forEach(([key, isOn]) => {
      const btn = buttonMap[key];
      if (!btn) return;
      btn.classList.toggle('is-active', !!isOn);
    });

    // Lists
    const listStates = {
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
    };

    Object.entries(listStates).forEach(([key, isOn]) => {
      const btn = buttonMap[key];
      if (!btn) return;
      btn.classList.toggle('is-active', !!isOn);
    });

    // Alignment
    const alignStates = {
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      alignJustify: document.queryCommandState('justifyFull'),
    };

    Object.entries(alignStates).forEach(([key, isOn]) => {
      const btn = buttonMap[key];
      if (!btn) return;
      btn.classList.toggle('is-active', !!isOn);
    });
  }

  // 1) Don’t let toolbar buttons steal focus
  document.querySelectorAll('#toolsWysiwyg .tbtn').forEach((button) => {
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    button.addEventListener('click', () => {
      editor.focus();
      // Let the command run first, then sync the toolbar state
      setTimeout(updateToolbarState, 0);
    });
  });

  // 2) Update toolbar as the user moves around in the editor
  document.addEventListener('selectionchange', updateToolbarState);
  editor.addEventListener('keyup', updateToolbarState);
  editor.addEventListener('mouseup', updateToolbarState);

  // Initial sync
  updateToolbarState();
}

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
        const html =
    docState.getCleanHtml() ||
    (wysiwyg?.innerHTML || '');

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

  // Mount Lexical WYSIWYG last, and sync editor → docState
  mountWysiwygEditor((html) => {
    // Lexical is now the source of truth when you're in WYSIWYG.
    docState.setCleanHtml(html, { from: 'wysiwyg' });
  });
});

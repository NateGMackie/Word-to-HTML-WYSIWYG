// src/main.js
import { createDocState } from './import/docState.js';
import { initWordView } from './views/word.js';
import { initHtmlView } from './views/html.js';
import { importHtmlToEditor } from './editor/importHtmlToEditor.js';
import { mountWysiwygEditor } from './editor/mountWysiwyg.js';
import { cleanHTML } from './import/htmlImport.js';


const $ = (id) => document.getElementById(id);

window.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // 1) DOM ELEMENTS (declare everything up front)
  // ============================================================
  // Core elements
  const wordInput = $('wordInput');
  const htmlEditor = $('htmlEditor');
  const wysiwyg = $('wysiwyg');

  const statBytes = $('statBytes');
  const statWords = $('statWords');
  const badgeActive = $('badgeActive');

  // Global buttons
  const btnCopy = $('btnCopy');
  const btnSave = $('btnSave');

  const btnThemeToggle = $('btnThemeToggle');
  const body = document.body;

  // Word/HTML tools
  const btnPaste = $('btnPaste');
  const btnClean = $('btnClean');
  const btnClearAll = $('btnClearAll');
  const btnFormatHtml = $('btnFormatHtml');

  // Menu
  const btnMenu = $('btnMenu');
  const menuPanel = $('menuPanel');
  const menuNew = $('menuNew');
  const menuImport = $('menuImport');
  const menuSave = $('menuSave'); // "Save draft"
  const menuOpenDraft = $('menuOpenDraft');
  const menuExportHtml = $('menuExportHtml');

  // Toolbars
  const toolsWord = $('toolsWord');
  const toolsHtml = $('toolsHtml');
  const toolsWysiwyg = $('toolsWysiwyg');

  // Views
  const viewWord = $('viewWord');
  const viewHtml = $('viewHtml');
  const viewWysiwyg = $('viewWysiwyg');

  // Navigation
  const navWord = $('navWord');
  const navHtml = $('navHtml');
  const navWysiwyg = $('navWysiwyg');

  // WYSIWYG toolbar buttons
  const stylesSelect = $('stylesSelect');
  const btnScreenshot = $('btnScreenshot');
  const btnNormalizeTable = $('btnNormalizeTable');
  const btnUserInput = $('btnUserInput');
  const btnVariable = $('btnVariable');
  const btnHr = $('btnHr');

  const btnUl = $('btnUl');
  const btnOl = $('btnOl');
  const btnIndent = $('btnIndent');
  const btnOutdent = $('btnOutdent');
  const btnAlignLeft = $('btnAlignLeft');
  const btnAlignCenter = $('btnAlignCenter');
  const btnAlignRight = $('btnAlignRight');
  const btnAlignJustify = $('btnAlignJustify');

  // Export CSS
  const exportCssTemplate = $('export-css');
const cssForExport = exportCssTemplate
  ? (exportCssTemplate.content?.textContent || exportCssTemplate.textContent || '').trim()
  : '';

if (!cssForExport) {
  console.warn('[export] No export CSS found. Check <template id="export-css"> in index.html');
}

  // ============================================================
  // 2) STATE
  // ============================================================
  let lexicalEditor = null;
  let suppressWysiwygToHtml = false;

  const docState = createDocState({ htmlEditor, wysiwyg, statBytes, statWords });

  let activeView = 'wysiwyg';

    // Draft session state (persists across saves until "New" or reload)
  let currentDraftFilename = null;   // e.g. "my-doc.drft"
  let currentDraftCreatedAt = null;  // ISO timestamp from first save/open


  function getActiveView() {
    return activeView;
  }

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

    // When entering HTML view, refresh the textarea from docState
    if (view === 'html' && htmlEditor) {
      htmlEditor.value = docState.getCleanHtml() || '';
    }
  }

  // ============================================================
  // 3) HELPERS (download/export, timestamps)
  // ============================================================
  function downloadBlob({ bytes, mime, filename }) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: mime }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function makeTimestampSlug(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}${mm}${dd}-${hh}${mi}`;
  }

    function htmlToText(html) {
    try {
      const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
      return (doc.body?.textContent || '').trim();
    } catch {
      return String(html || '').trim();
    }
  }

  function extractTitleFromHtml(html) {
    const source = String(html || '').trim();
    if (!source) return '';

    try {
      const doc = new DOMParser().parseFromString(source, 'text/html');

      // Prefer first heading as "title"
      const heading = doc.querySelector('h1,h2,h3,h4,h5,h6');
      if (heading) {
        const t = (heading.textContent || '').trim();
        if (t) return t;
      }

      // Fallback: first non-empty line of visible text
      const text = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
      return text;
    } catch {
      // Fallback: treat input as plain text, take first line-ish chunk
      return source.replace(/\s+/g, ' ').trim();
    }
  }

  function slugifyFilename(input, { maxLen = 60 } = {}) {
    const raw = String(input || '').trim();
    if (!raw) return 'blank';

    // Normalize and strip diacritics
    const normalized = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

    // Replace anything that’s not filename-friendly with spaces
    const cleaned = normalized
      .replace(/['"]/g, '')           // drop quotes
      .replace(/[^a-zA-Z0-9]+/g, ' ')  // non-alnum -> space
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();

    const clipped = cleaned.slice(0, maxLen).replace(/-+$/g, '');
    return clipped || 'blank';
  }

  function getDocBaseName() {
    // Prefer canonical clean HTML, fallback to current WYSIWYG DOM
    const html = docState.getCleanHtml() || (wysiwyg?.innerHTML || '');
    const title = extractTitleFromHtml(html);

    // Use only a portion (slugify handles truncation)
    return slugifyFilename(title || htmlToText(html) || 'blank');
  }

    function getInitialDraftFilename() {
    return `${getDocBaseName()}.drft`;
  }


  // ============================================================
  // 4) CLIPBOARD
  // ============================================================
    async function copyExportFragment() {
    try {
      const fragment = getExportFragmentHtml();
      if (!ensureExportIsValidOrAlert(fragment)) return;

      const data = [
        new ClipboardItem({
          'text/html': new Blob([fragment], { type: 'text/html' }),
'text/plain': new Blob([fragment], { type: 'text/plain' }),
        }),
      ];
      await navigator.clipboard.write(data);
    } catch {
      // Clipboard blocked or unsupported — silently fail for now
    }
  }


  // ============================================================
  // 5) EXPORT + DRAFT SAVE/OPEN
  // ============================================================
    function getExportFragmentHtml() {
    // Stage 7: export is always the canonical clean HTML fragment
    return String(docState.getCleanHtml() || '').trim();
  }

  function validateExportFragmentAgainstContract(html) {
    const source = String(html || '').trim();

    // Basic “gate” (expand later as contract hardens)
    if (!source) return { ok: false, message: 'Nothing to export yet.' };

    // Block full-document exports from slipping into fragment export
    const forbidden = [
      '<!doctype',
      '<html',
      '<head',
      '<body',
      '<script',
      '<style',
    ];

    const lower = source.toLowerCase();
    const hit = forbidden.find((t) => lower.includes(t));
    if (hit) {
      return {
        ok: false,
        message: `Export must be an HTML fragment (no ${hit}...). Use Publish for a full standalone HTML page.`,
      };
    }

    return { ok: true };
  }

  function ensureExportIsValidOrAlert(html) {
    const result = validateExportFragmentAgainstContract(html);
    if (!result.ok) {
      alert(result.message || 'Export blocked: content does not match the contract.');
      return false;
    }
    return true;
  }
  
    function exportFragmentFile() {
    const fragment = getExportFragmentHtml();
    if (!ensureExportIsValidOrAlert(fragment)) return;

    downloadBlob({
      bytes: fragment,
      mime: 'text/html;charset=utf-8',
      filename: `${getDocBaseName()}-${makeTimestampSlug()}.html`,
    });
  }

  function publishStandaloneHtmlFile() {
    const content = getExportFragmentHtml(); // publish uses the same canonical fragment
    if (!ensureExportIsValidOrAlert(content)) return;

    const doc = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${extractTitleFromHtml(content) || 'Document'}</title>
<style>${cssForExport}</style></head><body>${content}</body></html>`;

    downloadBlob({
      bytes: doc,
      mime: 'text/html;charset=utf-8',
      filename: `${getDocBaseName()}-${makeTimestampSlug()}.html`,
    });
  }

    function saveDraftFile() {
    const cleanHtml = docState.getCleanHtml() || '';

    let lexicalState = null;
    try {
      if (lexicalEditor) {
        lexicalState = lexicalEditor.getEditorState().toJSON();
      }
    } catch (e) {
      console.warn('Draft save: could not serialize Lexical state:', e);
    }

    // First-save behavior: pick a filename and store it for next time
    if (!currentDraftFilename) {
      currentDraftFilename = getInitialDraftFilename();
    }

    const nowIso = new Date().toISOString();
    if (!currentDraftCreatedAt) {
      currentDraftCreatedAt = nowIso;
    }

    const draft = {
      schema: 'w2h-draft',
      schemaVersion: 1,
      createdAt: currentDraftCreatedAt,
      updatedAt: nowIso,
      app: { name: 'w2h', version: 'dev' },
      state: {
        cleanHtml,
        lexical: lexicalState,
      },
      meta: {
        activeView: activeView || 'wysiwyg',
        filename: currentDraftFilename, // ✅ persisted name
      },
    };

    downloadBlob({
      bytes: JSON.stringify(draft, null, 2),
      mime: 'application/json;charset=utf-8',
      filename: currentDraftFilename, // ✅ no timestamp
    });
  }


  function ensureHiddenDraftInput() {
    let input = document.getElementById('draftFileInput');
    if (input) return input;

    input = document.createElement('input');
    input.id = 'draftFileInput';
    input.type = 'file';
    input.accept = '.drft,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      input.value = ''; // allow re-opening same file later
      if (!file) return;

      try {
        const text = await file.text();
        const draft = JSON.parse(text);

        if (draft?.schema !== 'w2h-draft') throw new Error('Not a w2h draft file.');
        if (typeof draft?.schemaVersion !== 'number') throw new Error('Draft schemaVersion missing.');
        if (draft.schemaVersion !== 1) throw new Error(`Unsupported draft schemaVersion: ${draft.schemaVersion}`);

        const cleanHtml = draft?.state?.cleanHtml ?? '';
        const lexical = draft?.state?.lexical ?? null;

                // Restore draft session info (so future saves reuse the same name)
        currentDraftFilename = draft?.meta?.filename || null;
        currentDraftCreatedAt = draft?.createdAt || null;

        // If older drafts didn't have meta.filename, derive one once
        if (!currentDraftFilename) {
          currentDraftFilename = getInitialDraftFilename();
        }


        // Restore HTML first
        docState.setCleanHtml(cleanHtml, { from: 'draft' });
        if (htmlEditor) htmlEditor.value = cleanHtml;

        // Restore Lexical if present
        if (lexicalEditor && lexical) {
          suppressWysiwygToHtml = true;
          try {
            const parsed = lexicalEditor.parseEditorState(JSON.stringify(lexical));
            lexicalEditor.setEditorState(parsed);
          } finally {
            setTimeout(() => {
              suppressWysiwygToHtml = false;
            }, 0);
          }
        }

        setActiveView('wysiwyg');
      } catch (err) {
        console.error('Open draft failed:', err);
        alert(`Could not open draft. ${err?.message || 'Unknown error'}`);
      }
    });

    return input;
  }

  function openDraftPicker() {
    ensureHiddenDraftInput().click();
  }

  // ============================================================
  // 6) VIEWS INIT
  // ============================================================
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
  loadHtmlIntoEditor: (html) => {
    if (!lexicalEditor) return;

    suppressWysiwygToHtml = true;

    try {
      importHtmlToEditor(lexicalEditor, String(html ?? ''));
    } finally {
      setTimeout(() => {
        suppressWysiwygToHtml = false;
      }, 0);
    }
  },
});


  initHtmlView({
    elements: sharedElements,
    docState,
    loadHtmlIntoEditor: (html) => {
      if (!lexicalEditor) return;

      suppressWysiwygToHtml = true;

      try {
importHtmlToEditor(lexicalEditor, String(html ?? ''));
      } catch (err) {
        // rethrow so HTML view can surface it
        throw err;
      } finally {
        setTimeout(() => {
          suppressWysiwygToHtml = false;
        }, 0);
      }
    },
  });

  // ============================================================
  // 7) EVENT WIRING (one place, after all declarations)
  // ============================================================
  // Theme
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      body.classList.toggle('theme-light');
      btnThemeToggle.textContent = body.classList.contains('theme-light') ? 'LIGHT' : 'DARK';
    });
  }

  // Nav
  navWord?.addEventListener('click', () => setActiveView('word'));
  navHtml?.addEventListener('click', () => setActiveView('html'));
  navWysiwyg?.addEventListener('click', () => setActiveView('wysiwyg'));

  // Global buttons
  btnCopy?.addEventListener('click', copyExportFragment);
  btnSave?.addEventListener('click', exportFragmentFile);

  // Menu toggle
  btnMenu?.addEventListener('click', () => {
    menuPanel?.classList.toggle('hidden');
  });

  // Menu: New
  menuNew?.addEventListener('click', () => {
  btnClearAll?.click();

  // Reset draft session
  currentDraftFilename = null;
  currentDraftCreatedAt = null;

  menuPanel?.classList.add('hidden');
});


  // Menu: Import (switch to Word view)
  menuImport?.addEventListener('click', async () => {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm,.drft';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;

      const name = (file.name || '').toLowerCase();

      // Route .drft to existing draft loader if you want Import to handle drafts too
      if (name.endsWith('.drft')) {
        // Option A: reuse your existing picker flow (recommended if you already have a solid loader)
        // openDraftFromFile(file);

        // Option B: if you only have openDraftPicker(), keep Import as HTML-only for now:
        alert('Use “Open draft” for .drft files (for now).');
        return;
      }

      const text = await file.text();

// 1) Scrub through contract first
// NOTE: you need to import cleanHTML at top of main.js (see below)
const { html } = cleanHTML(text);

// 2) Store canonical clean HTML
docState.setCleanHtml(html, { from: 'import' });
if (htmlEditor) htmlEditor.value = html;

// 3) Prep: load into editor
if (lexicalEditor) {
  suppressWysiwygToHtml = true;
  try {
    importHtmlToEditor(lexicalEditor, html);
  } finally {
    setTimeout(() => (suppressWysiwygToHtml = false), 0);
  }
}

setActiveView('wysiwyg');

    });

    input.click();
  } finally {
    menuPanel?.classList.add('hidden');
  }
});

  // Menu: Save draft (delegates to btnSave)
    menuSave?.addEventListener('click', () => {
    saveDraftFile();
    menuPanel?.classList.add('hidden');
  });


  // Menu: Open draft
  menuOpenDraft?.addEventListener('click', () => {
    openDraftPicker();
    menuPanel?.classList.add('hidden');
  });

  // Menu: Publish HTML
    menuExportHtml?.addEventListener('click', () => {
    publishStandaloneHtmlFile();
    menuPanel?.classList.add('hidden');
  });

    // Keep export fragment in sync with HTML view edits
  htmlEditor?.addEventListener('input', () => {
    if (getActiveView() !== 'html') return;
    docState.setCleanHtml(htmlEditor.value || '', { from: 'html' });
  });



  // ============================================================
  // 8) INIT DEFAULT STATE
  // ============================================================
  docState.setCleanHtml('', { from: 'system' });
  setActiveView('wysiwyg');

  // ============================================================
  // 9) MOUNT LEXICAL (last)
  // ============================================================
  mountWysiwygEditor({
    onEditorReady: (editor) => {
      lexicalEditor = editor;
    },
    onHtmlChange: (html) => {
  if (suppressWysiwygToHtml) return;

  const { html: cleaned } = cleanHTML(html);
  docState.setCleanHtml(cleaned, { from: 'wysiwyg' });
},

  });
});

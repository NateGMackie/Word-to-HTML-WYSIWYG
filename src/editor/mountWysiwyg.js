// src/editor/mountWysiwyg.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import WysiwygEditor from './WysiwygEditor.jsx';

/**
 * Mounts the Lexical-backed editor into #wysiwygRoot.
 * onHtmlChange is a callback you can use to keep the HTML view + docState in sync.
 */
export function mountWysiwygEditor({ onHtmlChange, onEditorReady } = {}) {
  const container = document.getElementById('wysiwygRoot');
  if (!container) {
    console.warn('mountWysiwygEditor: #wysiwygRoot not found in DOM');
    return;
  }

  const root = createRoot(container);

    root.render(
    React.createElement(WysiwygEditor, {
      onHtmlChange: onHtmlChange || (() => {}),
      onEditorReady: onEditorReady || (() => {}),
    }),
  );
}

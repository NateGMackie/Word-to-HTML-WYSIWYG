// src/editor/mountWysiwyg.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import WysiwygEditor from './WysiwygEditor.jsx';

export function mountWysiwygEditor(onHtmlChange) {
  const container = document.getElementById('wysiwygRoot');
  if (!container) {
    console.warn('mountWysiwygEditor: #wysiwygRoot not found in DOM');
    return;
  }

  const root = createRoot(container);

  root.render(
    React.createElement(WysiwygEditor, {
      onHtmlChange,
    }),
  );
}

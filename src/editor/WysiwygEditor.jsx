// src/editor/WysiwygEditor.jsx
import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $getRoot } from 'lexical';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';

import { editorConfig } from './lexicalConfig.js';
import ToolbarBridgePlugin from './ToolbarBridgePlugin.jsx';
import HeadingBridgePlugin from './HeadingBridgePlugin.jsx';

function Placeholder() {
  return (
    <div className="w2h-placeholder text-stone-500 italic">
      Start writing...
    </div>
  );
}

export default function WysiwygEditor({ onHtmlChange }) {
  const initialConfig = {
    ...editorConfig,
    editorState: null,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="w2h-editor-shell p-3 h-full">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="w2h-editor focus:outline-none" />
          }
          placeholder={<Placeholder />}
        />
        <HistoryPlugin />
        <LinkPlugin />
        <OnChangePlugin
          onChange={(editorState, editor) => {
            if (!onHtmlChange) return;

            editorState.read(() => {
              const root = $getRoot();
              const text = root.getTextContent();

              // Dumb exporter for now: wrap plain text in <p>, escape HTML
              const html = text
                ? `<p>${text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')}</p>`
                : '';

              onHtmlChange(html);
            });
          }}
        />
        <ToolbarBridgePlugin />
        <HeadingBridgePlugin />
      </div>
    </LexicalComposer>
  );
}

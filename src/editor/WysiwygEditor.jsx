// src/editor/WysiwygEditor.jsx
import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { $getRoot } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';

import { editorConfig } from './lexicalConfig.js';
import ToolbarBridgePlugin from './ToolbarBridgePlugin.jsx';
import HeadingBridgePlugin from './HeadingBridgePlugin.jsx';
import CalloutBridgePlugin from './CalloutBridgePlugin.jsx';
import { KeyboardPlugin } from '../plugins/KeyboardPlugin.js';



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
        <ListPlugin />
        <LinkPlugin />

        <OnChangePlugin
          onChange={(editorState, editor) => {
            if (!onHtmlChange) return;

            editorState.read(() => {
              const html = $generateHtmlFromNodes(editor);
              onHtmlChange(html);
            });
          }}
        />

        <ToolbarBridgePlugin />
        <HeadingBridgePlugin />
        <CalloutBridgePlugin />
        <KeyboardPlugin />
      </div>
    </LexicalComposer>
  );
}


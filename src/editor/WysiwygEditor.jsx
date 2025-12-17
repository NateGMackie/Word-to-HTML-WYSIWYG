// src/editor/WysiwygEditor.jsx
import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';

import { exportHtmlFromEditor } from '../export/htmlExport.js';

import { editorConfig } from './lexicalConfig.js';
import InitialParagraphPlugin from './InitialParagraphPlugin';
import ToolbarBridgePlugin from './ToolbarBridgePlugin.jsx';
import BlockFormatBridgePlugin from './BlockFormatBridgePlugin.jsx';
import CalloutBridgePlugin from './CalloutBridgePlugin.jsx';
import InlineFormatBridgePlugin from './InlineFormatBridgePlugin.jsx';
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

        {/* Make sure the editor never has an empty root:
            this creates an initial <p> and selects it on load */}
        <InitialParagraphPlugin />

        <HistoryPlugin />
        <ListPlugin />
        <TablePlugin />
        <LinkPlugin />

        <OnChangePlugin
          onChange={(editorState, editor) => {
            if (!onHtmlChange) return;

            editorState.read(() => {
  const html = exportHtmlFromEditor(editor);
  onHtmlChange(html);
});

          }}
        />

        <ToolbarBridgePlugin />
        <BlockFormatBridgePlugin />
        <CalloutBridgePlugin />
        <InlineFormatBridgePlugin />
        <KeyboardPlugin />
      </div>
    </LexicalComposer>
  );
}

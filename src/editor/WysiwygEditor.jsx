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

import { $generateHtmlFromNodes } from '@lexical/html';

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

// Strip editor-only classes and tidy up simple formatting wrappers
function cleanExportHtml(rawHtml) {
  let html = rawHtml;

  // 1) Remove any w2h-* classes but keep other classes
  html = html.replace(/\sclass="([^"]*)"/g, (match, classValue) => {
    const kept = classValue
      .split(/\s+/)
      .filter((name) => name && !name.startsWith('w2h-'));

    if (kept.length === 0) {
      return '';
    }

    return ` class="${kept.join(' ')}"`;
  });

  // 2) Collapse <b><strong>…</strong></b> → <strong>…</strong>
  html = html.replace(
    /<b>\s*(<strong\b[^>]*>[\s\S]*?<\/strong>)\s*<\/b>/gi,
    '$1',
  );

  // 3) Collapse <i><em>…</em></i> → <em>…</em>
  html = html.replace(
    /<i>\s*(<em\b[^>]*>[\s\S]*?<\/em>)\s*<\/i>/gi,
    '$1',
  );

  // 4) Remove value="…" from <li> (not needed for our output)
  html = html.replace(/\svalue="[\d]+"/g, '');

  // 5) Flatten <sub><span>text</span></sub> → <sub>text</sub>
  html = html.replace(
    /<sub\b([^>]*)>\s*<span\b[^>]*>([\s\S]*?)<\/span>\s*<\/sub>/gi,
    '<sub$1>$2</sub>',
  );

  // 6) Flatten <sup><span>text</span></sup> → <sup>text</sup>
  html = html.replace(
    /<sup\b([^>]*)>\s*<span\b[^>]*>([\s\S]*?)<\/span>\s*<\/sup>/gi,
    '<sup$1>$2</sup>',
  );

  // 7) (Optional) Unwrap simple spans that only add white-space: pre-wrap
  html = html.replace(
    /<span style="white-space:\s*pre-wrap;">([^<]*)<\/span>/gi,
    '$1',
  );

  // Remove white-space: pre-wrap from inline tags when safe
html = html.replace(
  /\sstyle="white-space:\s*pre-wrap;?"/g,
  ''
);

// Unwrap spans used only for pre-wrap on plain text (not inside <pre>)
html = html.replace(
  /<span style="white-space:\s*pre-wrap;">([^<]*)<\/span>/g,
  '$1'
);

  return html;
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
      const rawHtml = $generateHtmlFromNodes(editor);
      const html = cleanExportHtml(rawHtml);
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

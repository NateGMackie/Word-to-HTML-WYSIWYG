// src/editor/ToolbarBridgePlugin.jsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';

export default function ToolbarBridgePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    function hookButton(selector, format) {
      const btn = document.querySelector(selector);
      if (!btn) return null;

      const handler = (event) => {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
      };

      btn.addEventListener('mousedown', handler);
return () => btn.removeEventListener('mousedown', handler);

    }

    function hookLinkButton(selector) {
      const btn = document.querySelector(selector);
      if (!btn) return null;

      const handler = (event) => {
        event.preventDefault();

        const url = window.prompt(
          'Enter URL (leave blank to remove):',
          'https://',
        );
        if (url === null) return;

        const trimmed = url.trim();
        const payload = trimmed === '' ? null : trimmed;

        // Make sure Lexical has focus when we apply the command
        editor.focus();
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, payload);
      };

      btn.addEventListener('mousedown', handler);
return () => btn.removeEventListener('mousedown', handler);

    }

    function hookUnlinkButton(selector) {
      const btn = document.querySelector(selector);
      if (!btn) return null;

      const handler = (event) => {
        event.preventDefault();
        editor.focus();
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      };

      btn.addEventListener('mousedown', handler);
return () => btn.removeEventListener('mousedown', handler);

    }

    function hookListButton(selector, command) {
      const btn = document.querySelector(selector);
      if (!btn) return null;

      const handler = (event) => {
        event.preventDefault();
        editor.focus();
        editor.dispatchCommand(command, undefined);
      };

      btn.addEventListener('mousedown', handler);
return () => btn.removeEventListener('mousedown', handler);

    }

    // NEW: generic indent/outdent commands from Lexical core
    function hookIndentButton(selector, command) {
      const btn = document.querySelector(selector);
      if (!btn) return null;

      const handler = (event) => {
        event.preventDefault();
        editor.focus();
        editor.dispatchCommand(command, undefined);
      };

      btn.addEventListener('mousedown', handler);
return () => btn.removeEventListener('mousedown', handler);

    }

        // NEW: inline formatting via InlineFormatBridgePlugin
    function hookInlineFormatButton(selector, bridgeMethodName) {
      const btn = document.querySelector(selector);
      if (!btn) return null;

      const handler = (event) => {
        event.preventDefault();
        editor.focus();

        const bridge = window.w2hInlineFormatBridge;
        if (!bridge || typeof bridge[bridgeMethodName] !== 'function') {
          console.warn(
            'InlineFormatBridgePlugin not ready or method missing:',
            bridgeMethodName,
          );
          return;
        }

        bridge[bridgeMethodName]();
      };

      btn.addEventListener('mousedown', handler);
return () => btn.removeEventListener('mousedown', handler);

    }

    const cleanups = [
      // Inline formatting
      hookButton('#toolsWysiwyg [data-action="bold"]', 'bold'),
      hookButton('#toolsWysiwyg [data-action="italic"]', 'italic'),
      hookButton('#toolsWysiwyg [data-action="underline"]', 'underline'),
      hookButton('#toolsWysiwyg [data-action="strikeThrough"]', 'strikethrough'),
      hookButton('#toolsWysiwyg [data-action="subscript"]', 'subscript'),
      hookButton('#toolsWysiwyg [data-action="superscript"]', 'superscript'),

      // Links
      hookLinkButton('#toolsWysiwyg [data-action="link"]'),
      hookUnlinkButton('#toolsWysiwyg [data-action="unlink"]'),

      // Lists: toggle OL / UL
      hookListButton('#btnUl', INSERT_UNORDERED_LIST_COMMAND),
      hookListButton('#btnOl', INSERT_ORDERED_LIST_COMMAND),

      // NEW: List/paragraph indentation (nested lists)
      hookIndentButton('#btnIndent', INDENT_CONTENT_COMMAND),
      hookIndentButton('#btnOutdent', OUTDENT_CONTENT_COMMAND),
    

    // NEW: User Input / Variable (InlineFormatBridgePlugin)
      hookInlineFormatButton('#btnUserInput', 'wrapSelectionWithUserInput'),
      hookInlineFormatButton('#btnVariable', 'wrapSelectionWithVariable'),
    ].filter(Boolean);

    return () => {
      cleanups.forEach((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [editor]);

  return null;
}

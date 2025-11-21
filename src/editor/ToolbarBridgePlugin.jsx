// src/editor/ToolbarBridgePlugin.jsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';

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

      btn.addEventListener('click', handler);
      return () => btn.removeEventListener('click', handler);
    }

    const cleanups = [
      hookButton('#toolsWysiwyg [data-action="bold"]', 'bold'),
      hookButton('#toolsWysiwyg [data-action="italic"]', 'italic'),
      hookButton('#toolsWysiwyg [data-action="underline"]', 'underline'),
      hookButton('#toolsWysiwyg [data-action="strikeThrough"]', 'strikethrough'),
    ].filter(Boolean);

    return () => {
      cleanups.forEach((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [editor]);

  return null;
}

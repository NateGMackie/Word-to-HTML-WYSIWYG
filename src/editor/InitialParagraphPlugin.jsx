// src/editor/InitialParagraphPlugin.jsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode } from 'lexical';

export default function InitialParagraphPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();

      // If the editor is completely empty, create a paragraph and select it
      if (root.getFirstChild() === null) {
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.select();
      }
    });
  }, [editor]);

  return null;
}

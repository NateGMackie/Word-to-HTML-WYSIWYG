// src/editor/HeadingBridgePlugin.jsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $getRoot,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode } from '@lexical/rich-text';

export default function HeadingBridgePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const select = document.getElementById('stylesSelect');
    if (!select) {
      console.warn('HeadingBridgePlugin: #stylesSelect not found');
      return;
    }

    console.log('HeadingBridgePlugin: attached to #stylesSelect');

    const handler = (event) => {
      const value = event.target.value || '';
      console.log('HeadingBridgePlugin: change event value =', value);

      if (!value.startsWith('block:')) {
        // Ignore callouts etc.
        return;
      }

      event.preventDefault();

      const tag = value.split(':')[1]; // "p", "h1", "h2", "h3", etc.
      console.log('HeadingBridgePlugin: requested tag =', tag);

      editor.update(() => {
        const selection = $getSelection();
        const root = $getRoot();
        console.log('HeadingBridgePlugin: root children =', root.getChildren().length);

        if (!$isRangeSelection(selection)) {
          console.log('HeadingBridgePlugin: no range selection, aborting');
          // Still reset dropdown so UI doesn’t get stuck
          select.selectedIndex = 0;
          return;
        }

        console.log('HeadingBridgePlugin: selection is a RangeSelection');

        if (tag === 'p') {
          console.log('HeadingBridgePlugin: applying paragraph');
          $setBlocksType(selection, () => $createParagraphNode());
        } else if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
          console.log('HeadingBridgePlugin: applying heading', tag);
          $setBlocksType(selection, () => $createHeadingNode(tag));
        } else {
          console.log('HeadingBridgePlugin: unsupported block tag, ignoring:', tag);
        }

        // Reset the dropdown visual state
        select.selectedIndex = 0;
      });

      // Keep focus in Lexical editor
      editor.focus();
    };

    select.addEventListener('change', handler);
    return () => {
      console.log('HeadingBridgePlugin: removing listener');
      select.removeEventListener('change', handler);
    };
  }, [editor]);

  return null;
}

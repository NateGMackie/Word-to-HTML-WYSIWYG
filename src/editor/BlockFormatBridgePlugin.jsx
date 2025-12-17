// src/editor/BlockFormatBridgePlugin.jsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $getRoot,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';

export default function BlockFormatBridgePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const select = document.getElementById('stylesSelect');
    
    const handler = (event) => {
  const value = event.target.value || '';
  console.log('BlockFormatBridgePlugin: change event value =', value);

  if (!value.startsWith('block:')) {
    // Ignore callouts etc.
    return;
  }

  const tag = value.split(':')[1]; // "p", "h1", "h2", "h3", "pre", etc.
  console.log('BlockFormatBridgePlugin: requested tag =', tag);

  event.preventDefault();

  editor.update(() => {
    const selection = $getSelection();
    const root = $getRoot();
    console.log('BlockFormatBridgePlugin: root children =', root.getChildren().length);

    if (!$isRangeSelection(selection)) {
      console.log('BlockFormatBridgePlugin: no range selection, aborting');
      // Still reset dropdown so UI doesn’t get stuck
      select.selectedIndex = 0;
      return;
    }

    console.log('BlockFormatBridgePlugin: selection is a RangeSelection');

        if (tag === 'p') {
      console.log('BlockFormatBridgePlugin: applying paragraph');
      $setBlocksType(selection, () => $createParagraphNode());
    } else if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      console.log('BlockFormatBridgePlugin: applying heading', tag);
      $setBlocksType(selection, () => $createHeadingNode(tag));
    } else if (tag === 'blockquote') {
      console.log('BlockFormatBridgePlugin: applying blockquote');
      $setBlocksType(selection, () => $createQuoteNode());
    } else if (tag === 'pre') {
      console.log('BlockFormatBridgePlugin: applying code block');
      $setBlocksType(selection, () => $createCodeNode());
    } else {
      console.log('BlockFormatBridgePlugin: unsupported block tag, ignoring:', tag);
    }


    // Reset the dropdown visual state
    select.selectedIndex = 0;
  });

  // Keep focus in Lexical editor
  editor.focus();
};


    select.addEventListener('change', handler);
    return () => {
      console.log('BlockFormatBridgePlugin: removing listener');
      select.removeEventListener('change', handler);
    };
  }, [editor]);

  return null;
}

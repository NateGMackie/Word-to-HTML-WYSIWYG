// src/editor/InlineFormatBridgePlugin.jsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $createRangeSelection, $setSelection } from 'lexical';


import { UserInputNode } from '../nodes/UserInputNode.js';
import { VariableNode } from '../nodes/VariableNode.js';

export default function InlineFormatBridgePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    function wrapSelectionWithInlineNode(createNode) {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) return;

    // Must be inside one top-level block
    const anchorTop = selection.anchor.getNode().getTopLevelElementOrThrow();
    const focusTop = selection.focus.getNode().getTopLevelElementOrThrow();
    if (anchorTop !== focusTop) {
      console.warn('InlineFormatBridgePlugin: selection spans multiple blocks; skipping.');
      return;
    }

    // ✅ Snapshot insertion point BEFORE we mutate anything
    const isBackward = selection.isBackward();
    const startPoint = isBackward ? selection.focus : selection.anchor;

    const insertNodeKey = startPoint.key;
    const insertOffset = startPoint.offset;
    const insertType = startPoint.type; // 'text' or 'element'

    // Extract (this mutates selection + tree)
    const extracted = selection.extract();
    if (extracted.length === 0) return;

    // Safety: extracted content should be inline-ish only
    for (const n of extracted) {
      if (typeof n.isInline === 'function' && !n.isInline()) {
        // Put back where it was by creating a wrapper-less insert
        console.warn('InlineFormatBridgePlugin: extracted a non-inline node; skipping.');
        return;
      }
    }

    const wrapper = createNode();
    wrapper.append(...extracted);

    // ✅ Recreate a fresh RangeSelection at the original insertion point
    const nextSelection = $createRangeSelection();
    nextSelection.anchor.set(insertNodeKey, insertOffset, insertType);
    nextSelection.focus.set(insertNodeKey, insertOffset, insertType);
    $setSelection(nextSelection);

    // Insert wrapper at that point
    nextSelection.insertNodes([wrapper]);

    // Optional: move caret after wrapper
    // wrapper.selectNext();
  });
}




    const api = {
      /**
       * Wrap the current selection in a <span class="user-input">…</span>.
       * Works on partial words, multiple words, and mixed inline formatting.
       */
      wrapSelectionWithUserInput() {
        wrapSelectionWithInlineNode(() => new UserInputNode());
      },

      /**
       * Wrap the current selection in a <span class="variable">…</span>.
       * Can be applied inside existing user-input spans, like bold/italic.
       */
      wrapSelectionWithVariable() {
        wrapSelectionWithInlineNode(() => new VariableNode());
      },
    };

    // Expose for your toolbar (ToolbarBridgePlugin)
    window.w2hInlineFormatBridge = api;

    return () => {
      if (window.w2hInlineFormatBridge === api) {
        delete window.w2hInlineFormatBridge;
      }
    };
  }, [editor]);

  return null;
}

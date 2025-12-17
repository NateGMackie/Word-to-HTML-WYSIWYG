// src/editor/CalloutBridgePlugin.jsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $createParagraphNode,
  $isElementNode,
  $isTextNode,
  $getRoot,
  $isParagraphNode,
} from 'lexical';

import {
  $createCalloutNode,
  $isCalloutNode,
  $initializeCalloutLabel,
} from '../nodes/CalloutNode.js';


// Map the <select> value into our internal "kind"
function mapValueToKind(raw) {
  // raw: "callout:note", "callout:warning", "callout:example", "callout:remove"
  const [, key] = raw.split(':');
  if (!key) return null;

  if (key === 'remove') return 'remove';

  if (key === 'note' || key === 'example' || key === 'warning') return key;

  if (key === 'blockquote') return 'blockquote';

  return null;
}

export default function CalloutBridgePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const select = document.getElementById('stylesSelect');
    if (!select) {
      console.warn('CalloutBridgePlugin: #stylesSelect not found');
      return;
    }

    const handler = (event) => {
      const value = event.target.value || '';

      if (!value.startsWith('callout:')) {
        return;
      }

      event.preventDefault();

      const kindKey = mapValueToKind(value);
      // Reset dropdown visual state so it doesn't stay on "Note"
      select.selectedIndex = 0;

      if (!kindKey) {
        editor.focus();
        return;
      }

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        const anchorNode = selection.anchor.getNode();
        if (!anchorNode) {
          return;
        }

        // --- 0. Check if we're inside an existing callout ---
        let node = anchorNode;
        let calloutNode = null;

        while (node && !$isRootOrShadowRoot(node)) {
          if ($isCalloutNode(node)) {
            calloutNode = node;
            break;
          }
          node = node.getParent();
        }

// Helper: remove the "Note:" / "Example:" label prefix from the first paragraph



        // Helper: unwrap a callout (move its children to parent, normalize inline nodes)
const unwrapCallout = (callout) => {
  const parent = callout.getParent();
  if (!parent) return;

  const children = callout.getChildren();
  const nodesToInsert = [];

  children.forEach((child) => {
    if ($isElementNode(child)) {
      nodesToInsert.push(child);
    } else if ($isTextNode(child)) {
      const paragraph = $createParagraphNode();
      paragraph.append(child);
      nodesToInsert.push(paragraph);
    } else {
      const paragraph = $createParagraphNode();
      paragraph.append(child);
      nodesToInsert.push(paragraph);
    }
  });

  if (nodesToInsert.length === 0) {
    const paragraph = $createParagraphNode();
    callout.insertBefore(paragraph);
    callout.remove();
    return;
  }

  nodesToInsert.forEach((node) => {
    callout.insertBefore(node);
  });

  callout.remove();
};

// Helper: after unwrapping, remove top-level "Note:" / "Example:" paragraphs and empty paragraphs
const cleanupTopLevelLabelParagraphs = () => {
  const root = $getRoot();
  const children = root.getChildren();

  children.forEach((child) => {
    if ($isParagraphNode(child)) {
      const text = (child.getTextContent() || '').trim();

      // Remove label-only paragraphs and empty paragraphs
      if (text === 'Note:' || text === 'Example:' || text === '') {
        child.remove();
      }
    }
  });
};




        // CASE 1: We're inside an existing callout
if (calloutNode) {
  if (kindKey === 'remove') {
    unwrapCallout(calloutNode);
    cleanupTopLevelLabelParagraphs();
    return;
  }

  if (calloutNode.getKind() === kindKey) {
    // Toggle off if same kind
    unwrapCallout(calloutNode);
    cleanupTopLevelLabelParagraphs();
  } else {
    // Switch kind
    calloutNode.setKind(kindKey);

    if (kindKey === 'note' || kindKey === 'example') {
      const wasEmpty = calloutNode.getFirstChild() == null;
      const spaceNode = $initializeCalloutLabel(calloutNode);
      // Only move the caret if we just created a blank labeled callout
      if (wasEmpty && spaceNode) {
        spaceNode.select(1, 1);
      }
    }
  }
  return;
}


        // CASE 2: Not in a callout; ignore if we're removing
        if (kindKey === 'remove') {
          return;
        }

        // ----- 2a. Step-level callout inside a list-item (collapsed selection only, priority) -----
        if (selection.isCollapsed()) {
          let listItemNode = anchorNode;
          while (listItemNode && !$isRootOrShadowRoot(listItemNode)) {
            if (
              typeof listItemNode.getType === 'function' &&
              listItemNode.getType() === 'listitem'
            ) {
              break;
            }
            listItemNode = listItemNode.getParent();
          }

          if (
            listItemNode &&
            typeof listItemNode.getType === 'function' &&
            listItemNode.getType() === 'listitem'
          ) {
            // We're inside a list-item → create a step-level callout as a child of that list-item.
            // Find the immediate child of the list-item that contains the anchor.
            let innerBlock = anchorNode;
            while (
              innerBlock &&
              innerBlock.getParent() !== listItemNode &&
              !$isRootOrShadowRoot(innerBlock)
            ) {
              innerBlock = innerBlock.getParent();
            }

            if (innerBlock && innerBlock.getParent() === listItemNode) {
              const callout = $createCalloutNode(kindKey);
              // Insert the callout after the current block inside the list-item
              innerBlock.insertAfter(callout);

              if (kindKey === 'note' || kindKey === 'example') {
                const wasEmpty = callout.getFirstChild() == null;
                const spaceNode = $initializeCalloutLabel(callout);
                if (wasEmpty && spaceNode) {
                  spaceNode.select(1, 1);
                }
              } else {
                const paragraph = $createParagraphNode();
                callout.append(paragraph);
                paragraph.select();
              }

              return;
            }
            // If we couldn't resolve a sane innerBlock, we fall through to the generic behavior.
          }
        }

        // ----- 2b. Multi-select at root level (wrap multiple top-level siblings) -----
        if (!selection.isCollapsed()) {
          const anchorBlock =
            anchorNode.getTopLevelElementOrThrow();
          const focusBlock =
            selection.focus.getNode().getTopLevelElementOrThrow();

          // Multi-wrap only when selection truly spans >1 top-level block
          if (anchorBlock !== focusBlock) {
            const parent = anchorBlock.getParent();
            const sameParent = parent && parent === focusBlock.getParent();

            if (sameParent && $isRootOrShadowRoot(parent)) {
              // Determine first/last block in document order
              const anchorBeforeFocus = anchorBlock.isBefore(focusBlock);
              const firstBlock = anchorBeforeFocus ? anchorBlock : focusBlock;
              const lastBlock = anchorBeforeFocus ? focusBlock : anchorBlock;

              const callout = $createCalloutNode(kindKey);
              firstBlock.insertBefore(callout);

              // Move all siblings from firstBlock through lastBlock into the callout
              let current = firstBlock;
              while (current) {
                const next = current.getNextSibling();
                callout.append(current);
                if (current === lastBlock) break;
                current = next;
              }

              if (kindKey === 'note' || kindKey === 'example') {
                const wasEmpty = callout.getFirstChild() == null;
                const spaceNode = $initializeCalloutLabel(callout);
                // In this multi-block case, callout won't be empty, so we won't move the caret.
                if (wasEmpty && spaceNode) {
                  spaceNode.select(1, 1);
                }
              }

              return;
            }
          }
          // If selection spans a single block or a non-root parent, we don't do multi-select; fall through.
        }

        // ----- 2c. Generic single-block behavior (your original logic) -----
        const rootLike = $isRootOrShadowRoot(anchorNode)
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

        const callout = $createCalloutNode(kindKey);

        // If we're on the root (empty editor case)
        if ($isRootOrShadowRoot(rootLike)) {
          rootLike.append(callout);

          if (kindKey === 'note' || kindKey === 'example') {
            const wasEmpty = callout.getFirstChild() == null;
            const spaceNode = $initializeCalloutLabel(callout);
            if (wasEmpty && spaceNode) {
              spaceNode.select(1, 1); // caret after label for a blank callout
            }
          } else {
            const paragraph = $createParagraphNode();
            callout.append(paragraph);
            paragraph.select();
          }

          return;
        }

        // Otherwise, wrap the existing top-level block (paragraph, list, etc.)
        const block = rootLike;
        block.insertBefore(callout);
        callout.append(block);

        if (kindKey === 'note' || kindKey === 'example') {
          const wasEmpty = callout.getFirstChild() == null;
          const spaceNode = $initializeCalloutLabel(callout);
          // Here we're wrapping existing content → callout has children → wasEmpty is false → caret stays put.
          if (wasEmpty && spaceNode) {
            spaceNode.select(1, 1);
          }
        }
      });

      editor.focus();
    };

    select.addEventListener('change', handler);
    return () => {
      select.removeEventListener('change', handler);
    };
  }, [editor]);

  return null;
}

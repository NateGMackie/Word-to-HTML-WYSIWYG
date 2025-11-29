// src/editor/CalloutBridgePlugin.jsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $createParagraphNode,
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

        // Find nearest Callout ancestor, if any
        let node = selection.anchor.getNode();
        let calloutNode = null;

        while (node && !$isRootOrShadowRoot(node)) {
          if ($isCalloutNode(node)) {
            calloutNode = node;
            break;
          }
          node = node.getParent();
        }

        // Helper: unwrap a callout (move its children to parent, then remove)
        const unwrapCallout = (callout) => {
          const parent = callout.getParent();
          if (!parent) return;

          const children = callout.getChildren();

          // Move each child out, placing it just before the callout
          children.forEach((child) => {
            callout.insertBefore(child);
          });

          callout.remove();
        };

        // CASE 1: We're inside an existing callout
        if (calloutNode) {
          if (kindKey === 'remove') {
            unwrapCallout(calloutNode);
            return;
          }

          // Toggle off if same kind; otherwise switch kind
          if (calloutNode.getKind() === kindKey) {
            unwrapCallout(calloutNode);
          } else {
            calloutNode.setKind(kindKey);

            // If we just turned it into note/example, let the helper decide
            if (kindKey === 'note' || kindKey === 'example') {
              const spaceNode = $initializeCalloutLabel(calloutNode);
              if (spaceNode) {
                spaceNode.select(1, 1);
              }
            }
          }
          return;
        }

        // CASE 2: Not in a callout; we only act if we're not removing
        if (kindKey === 'remove') {
          return;
        }

        const anchorNode = selection.anchor.getNode();
        if (!anchorNode) {
          return;
        }

        const rootLike = $isRootOrShadowRoot(anchorNode)
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

        const callout = $createCalloutNode(kindKey);

        // If we're on the root (empty editor case)
        if ($isRootOrShadowRoot(rootLike)) {
          rootLike.append(callout);

          if (kindKey === 'note' || kindKey === 'example') {
            const spaceNode = $initializeCalloutLabel(callout);
            if (spaceNode) {
              spaceNode.select(1, 1); // caret after "Note: " / "Example: "
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

        // MVP: if this is note/example and the wrapped block is a blank line,
        // $initializeCalloutLabel will insert the label. If the block has text,
        // the helper will no-op.
        if (kindKey === 'note' || kindKey === 'example') {
          const spaceNode = $initializeCalloutLabel(callout);
          if (spaceNode) {
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

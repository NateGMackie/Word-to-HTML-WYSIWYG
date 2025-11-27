// src/plugins/KeyboardPlugin.js
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  KEY_ENTER_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_TAB_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $createParagraphNode,
} from 'lexical';
import { $isCalloutNode } from '../nodes/CalloutNode.js';

export function KeyboardPlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    // 1) Plain Enter → let Lexical/ListPlugin handle it for now
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        // No special behavior yet → fall through to default
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    // 2) Modifier keys (Shift+Enter, Ctrl+ArrowUp, Ctrl+ArrowDown)
    const unregisterModifiers = editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (event) => {
        // --- Shift+Enter: soft-break placeholder ---
        if (event.key === 'Enter' && event.shiftKey) {
          // Later we can tighten this to selection.insertLineBreak() in editor.update()
          event.preventDefault();
          return true;
        }

        // Helper: find enclosing CalloutNode (if any)
        const findEnclosingCallout = () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return null;
          if (!selection.isCollapsed()) return null;

          let node = selection.anchor.getNode();
          let callout = null;

          while (node && !$isRootOrShadowRoot(node)) {
            if ($isCalloutNode(node)) {
              callout = node;
              break;
            }
            node = node.getParent();
          }

          return callout;
        };

        // --- Ctrl+ArrowDown: exit callout below ---
        if (event.key === 'ArrowDown' && event.ctrlKey) {
          let handled = false;

          editor.update(() => {
            const callout = findEnclosingCallout();
            if (!callout) return;

            event.preventDefault();

            const nextSibling = callout.getNextSibling();

            if (nextSibling) {
              // There IS content after the callout → move caret there
              nextSibling.selectStart();
              handled = true;
              return;
            }

            // No sibling below → create a new paragraph after the callout
            const paragraph = $createParagraphNode();
            callout.insertAfter(paragraph);
            paragraph.select();

            handled = true;
          });

          return handled;
        }

        // --- Ctrl+ArrowUp: exit callout above ---
        if (event.key === 'ArrowUp' && event.ctrlKey) {
          let handled = false;

          editor.update(() => {
            const callout = findEnclosingCallout();
            if (!callout) return;

            event.preventDefault();

            const prevSibling = callout.getPreviousSibling();

            if (prevSibling) {
              // There IS content above the callout → move caret there
              prevSibling.selectStart();
              handled = true;
              return;
            }

            // No sibling above → create a new paragraph before the callout
            const paragraph = $createParagraphNode();
            callout.insertBefore(paragraph);
            paragraph.select();

            handled = true;
          });

          return handled;
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    // 3) Tab / Shift+Tab → indent / outdent
    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        // Prevent browser from leaving the editor
        event.preventDefault();

        if (event.shiftKey) {
          // Shift+Tab = outdent
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
        } else {
          // Tab = indent
          editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
        }

        return true; // we handled the key
      },
      COMMAND_PRIORITY_EDITOR,
    );

    return () => {
      unregisterEnter();
      unregisterModifiers();
      unregisterTab();
    };
  }, [editor]);

  return null;
}

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
  COMMAND_PRIORITY_LOW,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $createParagraphNode,
} from 'lexical';
import { $isCalloutNode } from '../nodes/CalloutNode.js';
import { $isListItemNode, $isListNode } from '@lexical/list';

export function KeyboardPlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    // 1) Enter → cleanup "two empty lis at end of list inside callout"
const unregisterEnter = editor.registerCommand(
  KEY_ENTER_COMMAND,
  (event) => {
    // May be null if dispatched programmatically
    if (!event) {
      return false;
    }

    // Only care about *plain* Enter (no modifiers)
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return false;
    }

    let handled = false;

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (!selection.isCollapsed()) return;

      // Find enclosing ListItemNode, if any
      let node = selection.anchor.getNode();
      let listItem = null;

      while (node && !$isRootOrShadowRoot(node)) {
        if ($isListItemNode(node)) {
          listItem = node;
          break;
        }
        node = node.getParent();
      }

      if (!listItem) {
        // Not in a list item → nothing to clean up
        return;
      }

      // Current list item must be empty
      if (listItem.getTextContent().trim() !== '') {
        return;
      }

      const listNode = listItem.getParent();
      if (!listNode || !$isListNode(listNode)) {
        return;
      }

      // Only care when we're at the *end* of the list
      if (listItem.getNextSibling() !== null) {
        return;
      }

      // Previous sibling must exist and be a list item
      const prevItem = listItem.getPreviousSibling();
      if (!prevItem || !$isListItemNode(prevItem)) {
        return;
      }

      // Previous item must also be empty
      if (prevItem.getTextContent().trim() !== '') {
        return;
      }

      // Ensure this list is inside a CalloutNode
      let ancestor = listNode.getParent();
      let inCallout = false;

      while (ancestor && !$isRootOrShadowRoot(ancestor)) {
        if ($isCalloutNode(ancestor)) {
          inCallout = true;
          break;
        }
        ancestor = ancestor.getParent();
      }

      if (!inCallout) {
        // Outside callouts, leave Lexical's default behavior alone
        return;
      }

      // At this point we have:
      // <li>Item 1</li>
      // <li>Item 2</li>
      // <li></li>       ← prevItem
      // <li></li>       ← listItem (caret here)
      // at the end of a list inside a callout.

      event.preventDefault();

      // Remove both empty list items
      prevItem.remove();
      listItem.remove();

      // Insert a new paragraph AFTER the list, still inside the callout
      const paragraph = $createParagraphNode();
      listNode.insertAfter(paragraph);
      paragraph.select();

      handled = true;
    });

    return handled;
  },
  COMMAND_PRIORITY_LOW, // ⬅️ runs AFTER Lexical's own list handling
);


    // 2) Modifier keys: ONLY Ctrl+ArrowUp / Ctrl+ArrowDown
    const unregisterModifiers = editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (event) => {
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

        // For everything else (including Shift+Enter), let Lexical handle it.
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

// src/plugins/KeyboardPlugin.js
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  KEY_MODIFIER_COMMAND,
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
    // LOW priority: Enter → cleanup "two empty lis at end of list inside callout"
    const unregisterEnterCleanup = editor.registerCommand(
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

          console.log('[KeyboardPlugin] Enter cleanup fired', {
            selectionText: selection.getTextContent(),
            listItemKey: listItem.getKey(),
          });

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
      COMMAND_PRIORITY_LOW, // runs AFTER Lexical's own list handling
    );

    // LOW priority: Tab / Shift+Tab → delegate to Lexical indent/outdent
    const unregisterTabIndent = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        // We want Tab to control structure, not browser focus.
        event.preventDefault();

        if (event.shiftKey) {
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
        } else {
          editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
        }

        // Let Lexical's list/code/etc. nodes decide what to do with these commands.
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

        // LOW priority: Ctrl+ArrowUp / Ctrl+ArrowDown → escape out of a callout
    const unregisterCalloutEscape = editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (event) => {
        // Only handle real keyboard events
        if (!event) return false;

        // We care about: Ctrl+ArrowUp / Ctrl+ArrowDown (no other modifiers)
        if (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
          return false;
        }

        const isUp = event.key === 'ArrowUp';
        const isDown = event.key === 'ArrowDown';

        if (!isUp && !isDown) {
          return false;
        }

        let handled = false;

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;
          if (!selection.isCollapsed()) return;

          // Walk up from the caret to find an enclosing CalloutNode
          let node = selection.anchor.getNode();
          let calloutNode = null;

          while (node && !$isRootOrShadowRoot(node)) {
            if ($isCalloutNode(node)) {
              calloutNode = node;
              break;
            }
            node = node.getParent();
          }

          if (!calloutNode) {
            // Not inside a callout → let Lexical/default behavior run
            return;
          }

          const parent = calloutNode.getParent();
          if (!parent) {
            return;
          }

          const targetSibling = isUp
            ? calloutNode.getPreviousSibling()
            : calloutNode.getNextSibling();

          event.preventDefault();

          if (targetSibling) {
            // Move caret into existing sibling block
            targetSibling.select();
            handled = true;
            return;
          }

          // No sibling in that direction → create a new paragraph
          const paragraph = $createParagraphNode();

          if (isUp) {
            calloutNode.insertBefore(paragraph);
          } else {
            calloutNode.insertAfter(paragraph);
          }

          paragraph.select();
          handled = true;
        });

        return handled;
      },
      COMMAND_PRIORITY_LOW,
    );


    return () => {
      unregisterEnterCleanup();
      unregisterTabIndent();
      unregisterCalloutEscape();
    };
  }, [editor]);

  return null;
}

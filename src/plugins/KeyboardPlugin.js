import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  KEY_ENTER_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_TAB_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';

export function KeyboardPlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    // Enter behavior (default for now)
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        // TODO:
        // 1. Inspect selection
        // 2. If inside list → custom list behavior
        // 3. If inside callout(kind=code) → newline
        // 4. If inside callout(kind != code) → soft break
        // 5. Else → default paragraph behavior
        return false; // return true if you fully handled it
      },
      COMMAND_PRIORITY_EDITOR,
    );

    // Shift+Enter (soft break – still TODO)
    const unregisterShiftEnter = editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (payload) => {
        const { event } = payload;
        if (event.key === 'Enter' && event.shiftKey) {
          // TODO: soft break logic
          return true; // tell Lexical we handled Shift+Enter
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    // Tab / Shift+Tab → indent / outdent
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
      unregisterShiftEnter();
      unregisterTab();
    };
  }, [editor]);

  return null;
}

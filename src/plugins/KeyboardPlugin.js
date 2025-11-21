import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { KEY_ENTER_COMMAND, KEY_MODIFIER_COMMAND } from 'lexical';
import { COMMAND_PRIORITY_EDITOR } from 'lexical';

export function KeyboardPlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    // Enter behavior
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

    // Shift+Enter (treated as soft break)
    const unregisterShiftEnter = editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (payload) => {
        const { event } = payload;
        if (event.key === 'Enter' && event.shiftKey) {
          // TODO: soft break logic
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    return () => {
      unregisterEnter();
      unregisterShiftEnter();
    };
  }, [editor]);

  return null;
}

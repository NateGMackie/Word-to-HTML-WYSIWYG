// src/nodes/UserInputNode.js
import { ElementNode, $applyNodeReplacement } from 'lexical';

export class UserInputNode extends ElementNode {
  static getType() {
    return 'user-input';
  }

  static clone(node) {
    return new UserInputNode(node.__key);
  }

  // Treat this as an inline wrapper, not a block
  isInline() {
    return true;
  }

  // For JSON import (if/when you serialize editor state)
  static importJSON(serializedNode) {
    return $applyNodeReplacement(new UserInputNode());
  }

  // For HTML → Lexical (copy/paste, HTML import)
  static importDOM() {
    return {
      span: (domNode) => {
        if (
          domNode instanceof HTMLSpanElement &&
          domNode.classList.contains('user-input')
        ) {
          return {
            conversion: () => ({ node: new UserInputNode() }),
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'user-input',
      version: 1,
    };
  }

  createDOM(config) {
    const span = document.createElement('span');
    const theme = config.theme;
    span.className = theme.userInput || 'user-input';
    return span;
  }

  updateDOM() {
    // No dynamic DOM updates needed
    return false;
  }

  exportDOM(editor) {
    // Let Lexical recurse into children; we only provide the wrapper element.
    const span = document.createElement('span');
    const theme = editor._config.theme;
    span.className = theme.userInput || 'user-input';
    return { element: span };
  }
}

export function $createUserInputNode() {
  return new UserInputNode();
}

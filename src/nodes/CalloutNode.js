import { ElementNode } from 'lexical';

export class CalloutNode extends ElementNode {
  static getType() {
    return 'callout';
  }

  static clone(node) {
    return new CalloutNode(node.__kind, node.__key);
  }

  constructor(kind = 'note', key) {
    super(key);
    this.__kind = kind; // 'note' | 'warning' | 'example' | 'blockquote' | 'code'
  }

  // Serialization to JSON
  static importJSON(serialized) {
    const node = new CalloutNode(serialized.kind);
    return node;
  }

  exportJSON() {
    return {
      type: 'callout',
      version: 1,
      kind: this.__kind,
    };
  }

  // DOM export (HTML)
  exportDOM(editor) {
    const element = document.createElement(
      this.__kind === 'blockquote' ? 'div' : 'div',
    );

    const theme = editor._config.theme;
    const baseClass = theme.callout?.base || 'callout';
    const kindClass = theme.callout?.[this.__kind] || this.__kind;

    element.className = `${baseClass} ${kindClass}`;

    return { element };
  }

  // Optional: DOM import from HTML later
  static importDOM() {
    // TODO: Map <div class="callout note"> back to CalloutNode(kind='note')
  }

  // etc...
}

// Export helper for Lexical:
export function $createCalloutNode(kind = 'note') {
  return new CalloutNode(kind);
}

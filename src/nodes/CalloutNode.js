// src/nodes/CalloutNode.js
import { ElementNode, $applyNodeReplacement } from 'lexical';

/**
 * kind:
 *  - 'note'
 *  - 'warning'
 *  - 'example'
 *  - 'blockquote' (later)
 *  - 'code'       (later)
 */
export class CalloutNode extends ElementNode {
  /** @returns {'callout'} */
  static getType() {
    return 'callout';
  }

  static clone(node) {
    return new CalloutNode(node.__kind, node.__key);
  }

  constructor(kind = 'note', key) {
    super(key);
    this.__kind = kind;
  }

  // ---- Serialization ----

  static importJSON(serializedNode) {
    const { kind = 'note' } = serializedNode;
    const node = new CalloutNode(kind);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'callout',
      version: 1,
      kind: this.getKind(),
    };
  }

  // ---- DOM ----

  createDOM(_config) {
    const dom = document.createElement('div');
    dom.className = `callout ${this.__getKindClass()}`;
    return dom;
  }

  updateDOM(prevNode, dom) {
    if (prevNode.__kind !== this.__kind) {
      dom.className = `callout ${this.__getKindClass()}`;
    }
    // No need for Lexical to diff children via DOM.
    return false;
  }

  // ---- Kind helpers ----

  getKind() {
    const self = this.getLatest();
    return self.__kind;
  }

  setKind(kind) {
    const writable = this.getWritable();
    writable.__kind = kind;
  }

  __getKindClass() {
    const kind = this.getKind();
    switch (kind) {
      case 'note':
      case 'warning':
        // CSS: .callout.note / .callout.warning
        return kind;
      case 'example':
        // You already use .example-block in your CSS
        return 'example-block';
      case 'blockquote':
        return 'blockquote';
      case 'code':
        return 'code';
      default:
        return 'note';
    }
  }

  // Block node, not inline
  isInline() {
    return false;
  }

  // For now we only care about export; importDOM can come later.
  static importDOM() {
    return null;
  }

  exportDOM() {
    // For now: non-code callouts only.
    const kind = this.getKind();

    const element =
      kind === 'blockquote'
        ? document.createElement('blockquote')
        : document.createElement('div');

    element.className = `callout ${this.__getKindClass()}`;

    return { element };
  }
}

// Convenience helpers

export function $createCalloutNode(kind = 'note') {
  return $applyNodeReplacement(new CalloutNode(kind));
}

export function $isCalloutNode(node) {
  return node instanceof CalloutNode;
}

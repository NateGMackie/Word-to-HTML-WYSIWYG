// src/nodes/CalloutNode.js
import {
  ElementNode,
  $applyNodeReplacement,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';

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
      case 'example':
        return kind;
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

/**
 * Initialize label for note/example callouts:
 * <p><strong>Note:</strong>▮</p> or <p><strong>Example:</strong>▮</p>
 *
 * MVP behavior:
 * - Only for kind 'note' / 'example'.
 * - If the callout has no children, create a new <p>.
 * - If the callout has one empty <p>, reuse it.
 * - Returns the "space" TextNode so the caller can place the caret there.
 *
 * Does NOT modify callouts that already contain real content.
 */
export function $initializeCalloutLabel(calloutNode) {
  const kind = calloutNode.getKind();

  if (kind !== 'note' && kind !== 'example') {
    return null;
  }

  let paragraph = null;
  const firstChild = calloutNode.getFirstChild();

  if (!firstChild) {
    // No children yet → create a new paragraph
    paragraph = $createParagraphNode();
    calloutNode.append(paragraph);
  } else {
    // If there's already a child, only proceed if it's an empty paragraph
    if (
      typeof firstChild.getType === 'function' &&
      firstChild.getType() === 'paragraph' &&
      firstChild.getFirstChild() == null
    ) {
      // The callout wraps a blank line: reuse that empty paragraph
      paragraph = firstChild;
    } else {
      // There's already real content here; don't inject a label (beyond MVP)
      return null;
    }
  }

  const labelText = kind === 'note' ? 'Note:' : 'Example:';
  const labelNode = $createTextNode(labelText);
  labelNode.toggleFormat('bold'); // <strong>Note:</strong> / <strong>Example:</strong>

  // Space after the label, not bold
  const spaceNode = $createTextNode(' ');

  paragraph.append(labelNode, spaceNode);

  // Caller can put the caret after this space.
  return spaceNode;
}


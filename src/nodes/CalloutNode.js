// src/nodes/CalloutNode.js
import {
  ElementNode,
  $applyNodeReplacement,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';

const ALLOWED_KINDS = ['note', 'warning', 'example'];

/**
 * kind:
 *  - 'note'
 *  - 'warning'
 *  - 'example'
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
    this.__kind = ALLOWED_KINDS.includes(kind) ? kind : 'note';
  }

  setKind(kind) {
    const writable = this.getWritable();
    writable.__kind = ALLOWED_KINDS.includes(kind) ? kind : 'note';
  }

  // ---- Serialization ----

  static importJSON(serializedNode) {
    const { kind = 'note' } = serializedNode;
    const node = new CalloutNode(
      ALLOWED_KINDS.includes(kind) ? kind : 'note',
    );
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
    const prevKind = prevNode.__kind;
    const nextKind = this.__kind;

    if (prevKind !== nextKind) {
      dom.className = `callout ${this.__getKindClass()}`;
    }

    // We always use a <div>, so no need to recreate the DOM element.
    return false;
  }

  // ---- Kind helpers ----

  getKind() {
    const self = this.getLatest();
    return self.__kind;
  }

  __getKindClass() {
    const kind = this.getKind();
    switch (kind) {
      case 'note':
      case 'warning':
      case 'example':
        return kind;
      default:
        return 'note';
    }
  }

  // Block node, not inline
  isInline() {
    return false;
  }

  static importDOM() {
  return {
    div: (domNode) => {
      if (!(domNode instanceof HTMLElement)) return null;

      // Must be our canonical wrapper
      if (!domNode.classList.contains('callout')) return null;

      return {
        conversion: (node) => {
          const el = node; // HTMLElement
          const kind =
            el.classList.contains('note')
              ? 'note'
              : el.classList.contains('warning')
              ? 'warning'
              : el.classList.contains('example')
              ? 'example'
              : 'note';

          // IMPORTANT: use your actual factory/create method name here
          const calloutNode = $createCalloutNode(kind);

          return { node: calloutNode };
        },
        priority: 2,
      };
    },
  };
}


  exportDOM(editor) {
    const element = document.createElement('div');
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
 * Ensure label for note/example callouts.
 *
 * Handles:
 * - Callout with no children          → create <p><strong>Note:&nbsp;</strong>▮</p>
 * - Callout with one empty <p>        → reuse that <p> and add the label
 * - Callout with <p> that has text    → prepend <strong>Note:&nbsp;</strong> before existing content
 * - Callout whose first child is list → insert a new label <p> before the list (inside the callout)
 *
 * Returns the "space" TextNode after the label so the caller can place the caret there.
 */
export function $initializeCalloutLabel(calloutNode) {
  const kind = calloutNode.getKind();

  if (kind !== 'note' && kind !== 'example') {
    return null;
  }

  const labelText = kind === 'note' ? 'Note:\u00A0' : 'Example:\u00A0';
  const children = calloutNode.getChildren();
  let firstBlock = children[0];

  // Helper: create <p><strong>Label:&nbsp;</strong>␣</p>
  // If beforeNode is provided, insert it as a sibling before that node.
  // Otherwise append to the callout.
  const createLabelParagraph = (beforeNode = null) => {
    const paragraph = $createParagraphNode();

    const labelNode = $createTextNode(labelText);
    labelNode.toggleFormat('bold'); // <strong>Label:&nbsp;</strong>

    const spaceNode = $createTextNode(' ');

    paragraph.append(labelNode, spaceNode);

    if (beforeNode) {
      // Insert as previous sibling of `beforeNode` (inside same parent = callout)
      beforeNode.insertBefore(paragraph);
    } else {
      calloutNode.append(paragraph);
    }

    return spaceNode;
  };

  // If no children at all → just make a label paragraph.
  if (!firstBlock) {
    return createLabelParagraph();
  }

  const type =
    typeof firstBlock.getType === 'function' ? firstBlock.getType() : null;

  // Case A: First block is a paragraph
  if (type === 'paragraph') {
    const paragraph = firstBlock;
    const firstInline = paragraph.getFirstChild();

    // Check if there's already a bold "Note:" / "Example:" at the start
    if (
      firstInline &&
      typeof firstInline.getType === 'function' &&
      firstInline.getType() === 'text' &&
      firstInline.getTextContent() === labelText &&
      typeof firstInline.hasFormat === 'function' &&
      firstInline.hasFormat('bold')
    ) {
      // There is already a bold label; ensure there's a space after it and return that.
      let spaceNode = firstInline.getNextSibling();
      if (
        !spaceNode ||
        spaceNode.getType() !== 'text' ||
        !spaceNode.getTextContent().startsWith(' ')
      ) {
        spaceNode = $createTextNode(' ');
        paragraph.insertAfter(spaceNode, firstInline);
      }
      return spaceNode;
    }

    // If the paragraph is empty → just append label + space.
    if (!firstInline) {
      const labelNode = $createTextNode(labelText);
      labelNode.toggleFormat('bold');

      const spaceNode = $createTextNode(' ');

      paragraph.append(labelNode, spaceNode);
      return spaceNode;
    }

    // Paragraph has existing content, no label → prepend label before existing content.
    const originalFirst = firstInline;

    const labelNode = $createTextNode(labelText);
    labelNode.toggleFormat('bold');

    const spaceNode = $createTextNode(' ');

    paragraph.insertBefore(labelNode, originalFirst);
    paragraph.insertBefore(spaceNode, originalFirst);

    return spaceNode;
  }

  // Case B: First block is a list → insert a label paragraph before the list (inside callout)
  if (type === 'list') {
    return createLabelParagraph(firstBlock);
  }

  // Case C: Any other block type → be conservative, but still keep label inside callout
  return createLabelParagraph(firstBlock);
}

import { TextNode } from 'lexical';

export class VariableNode extends TextNode {
  static getType() {
    return 'variable';
  }

  static clone(node) {
    return new VariableNode(node.__text, node.__key);
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    const theme = config.theme;
    dom.className = theme.variable || 'variable';
    return dom;
  }

  static importJSON(serialized) {
    const node = new VariableNode(serialized.text);
    return node;
  }

  exportJSON() {
    return {
      type: 'variable',
      version: 1,
      text: this.getText(),
    };
  }

  exportDOM(editor) {
    const span = document.createElement('span');
    const theme = editor._config.theme;
    span.className = theme.variable || 'variable';
    span.textContent = this.getText();
    return { element: span };
  }
}

export function $createVariableNode(text) {
  return new VariableNode(text);
}

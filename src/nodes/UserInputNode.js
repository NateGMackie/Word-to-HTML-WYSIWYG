import { TextNode } from 'lexical';

export class UserInputNode extends TextNode {
  static getType() {
    return 'user-input';
  }

  static clone(node) {
    return new UserInputNode(node.__text, node.__key);
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    const theme = config.theme;
    dom.className = theme.userInput || 'user-input';
    return dom;
  }

  exportJSON() {
    return {
      type: 'user-input',
      version: 1,
      text: this.getText(),
    };
  }

  exportDOM(editor) {
    const span = document.createElement('span');
    const theme = editor._config.theme;
    span.className = theme.userInput || 'user-input';
    span.textContent = this.getText();
    return { element: span };
  }
}

export function $createUserInputNode(text) {
  return new UserInputNode(text);
}

// src/views/word.js
import { cleanHTML } from "../services/convert.js";

export function initWordView({
  elements,
  docState,
  setActiveView,
}) {
  const {
    wordInput,
    btnPaste,
    btnClean,
    btnClearAll,
    htmlEditor,
    wysiwyg,
  } = elements;

  if (!wordInput) return;

  // Clean: run Word → Clean HTML pipeline, then push into state and go to WYSIWYG
  btnClean?.addEventListener("click", () => {
    const rawWordHtml = wordInput.innerHTML;
    const cleaned = cleanHTML(rawWordHtml);

    docState.setCleanHtml(cleaned, { from: "system" });
    setActiveView("html");
  });

  // Reset everything
  // btnClearAll?.addEventListener("click", () => {
    // wordInput.innerHTML = "";
    // docState.setCleanHtml("", { from: "system" });
    // if (htmlEditor) htmlEditor.value = "";
    // if (wysiwyg) wysiwyg.innerHTML = "";
    // docState.updateStats();
  // });

  // Paste button: try HTML from clipboard, fallback to text
  btnPaste?.addEventListener("click", async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes("text/html")) {
          const html = await (await item.getType("text/html")).text();
          wordInput.innerHTML = html;
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      wordInput.textContent = text;
    } catch {
      // Silent fail – clipboard APIs can be blocked
    }
  });

  // When pasting directly into the editable div, keep Word’s HTML
  wordInput.addEventListener("paste", (e) => {
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      document.execCommand("insertHTML", false, html);
    }
  });
}

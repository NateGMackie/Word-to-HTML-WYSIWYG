import fs from "node:fs";
import { JSDOM } from "jsdom";

function installDomShim() {
  const dom = new JSDOM(`<!doctype html><html><body></body></html>`);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.NodeFilter = dom.window.NodeFilter;
}

installDomShim();

import { cleanHTML } from "../src/services/convert.js";
import { cleanAndNormalizeExportHtml } from "../src/export/htmlExport.js";

const html = fs.readFileSync("world.html", "utf8");

// Stage 1: Word / foreign HTML → clean canonical HTML
const cleaned = cleanHTML(html);

// Stage 2: Export contract normalization
const exported = cleanAndNormalizeExportHtml(cleaned);

function prettyHtml(html) {
  try {
    const VOID_TAGS = new Set([
      "area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr",
    ]);

    const INLINE_TAGS = new Set(["a","span","strong","em","u","s","sub","sup"]);

    const tab = "  ";
    const tpl = document.createElement("template");
    tpl.innerHTML = (html || "").trim();

    function escapeText(s) {
      return (s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\u00A0/g, "&nbsp;");
    }

    // Collapse normal whitespace but preserve NBSP (handled above as &nbsp;)
    function normalizeText(s) {
      return (s || "").replace(/[ \t\r\n]+/g, " ");
    }

    function attrsToString(el) {
      if (!el.attributes || el.attributes.length === 0) return "";
      const parts = [];
      for (const attr of el.attributes) {
        parts.push(`${attr.name}="${attr.value.replace(/"/g, "&quot;")}"`);
      }
      return " " + parts.join(" ");
    }

    // Serialize inline content (text + inline children) WITHOUT adding newlines/indent.
    function inlineInnerHTML(node) {
      let out = "";
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          // normalize spaces so we don't create weird line/space diffs
          out += escapeText(normalizeText(child.nodeValue || ""));
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const t = child.tagName.toLowerCase();
          const a = attrsToString(child);
          if (VOID_TAGS.has(t)) {
            out += `<${t}${a}>`;
          } else if (INLINE_TAGS.has(t)) {
            out += `<${t}${a}>${inlineInnerHTML(child)}</${t}>`;
          } else {
            // If a block sneaks inside inline (shouldn't), degrade to its text.
            out += escapeText(normalizeText(child.textContent || ""));
          }
        }
      }
      return out;
    }

    function formatNode(node, depth) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const attrs = attrsToString(node);

        // Void tags
        if (VOID_TAGS.has(tag)) return `${tab.repeat(depth)}<${tag}${attrs}>\n`;

      
        // Preserve exact text (including newlines) inside <pre> (fixtures rely on this)
        if (tag === "pre") {
          const text = node.textContent || "";
          return `${tab.repeat(depth)}<pre${attrs}>${escapeText(text)}</pre>\n`;
        }

        // Paragraph handling
        if (tag === "p") {
          // Special-case empty paragraph: fixtures expect <p><br></p> in one line
          const brOnly =
            node.childNodes.length === 1 &&
            node.firstChild.nodeType === Node.ELEMENT_NODE &&
            node.firstChild.tagName.toLowerCase() === "br";

          if (brOnly) {
            return `${tab.repeat(depth)}<p><br></p>\n`;
          }

          const parentTag = node.parentNode?.tagName?.toLowerCase() || "";
          const parentClass = node.parentNode?.getAttribute?.("class") || "";
          const inCallout = parentTag === "div" && /\bcallout\b/.test(parentClass);
          const inCell = parentTag === "td" || parentTag === "th";
          const inPlainDiv = parentTag === "div" && !/\bcallout\b/.test(parentClass);

          if (inCallout || inCell || inPlainDiv) {
  const inner = inlineInnerHTML(node).trim();
  return `${tab.repeat(depth)}<p>${inner}</p>\n`;
}

// If <p> contains any inline element, render its content on one indented line
// so `<strong>Bold</strong> and <em>Ital</em>` matches fixtures.
const hasInlineElement = Array.from(node.childNodes).some(
  (c) =>
    c.nodeType === Node.ELEMENT_NODE &&
    INLINE_TAGS.has(c.tagName.toLowerCase())
);

if (hasInlineElement) {
  const inner = inlineInnerHTML(node).trim();
  return (
    `${tab.repeat(depth)}<p>\n` +
    `${tab.repeat(depth + 1)}${inner}\n` +
    `${tab.repeat(depth)}</p>\n`
  );
}

          // Text-only paragraph: block form with indentation
          const text = normalizeText(node.textContent || "").trim();
          return (
            `${tab.repeat(depth)}<p>\n` +
            `${tab.repeat(depth + 1)}${escapeText(text)}\n` +
            `${tab.repeat(depth)}</p>\n`
          );
        }

        // Compact simple list items: <li>One</li>
        if (tag === "li") {
          const onlyText =
            node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE;
          if (onlyText) {
            const text = escapeText(normalizeText(node.firstChild.nodeValue || "").trim());
            return `${tab.repeat(depth)}<li>${text}</li>\n`;
          }
          // otherwise fall through
        }

        // Inline tags: ALWAYS serialize inline content on one line
        if (INLINE_TAGS.has(tag)) {
          return `${tab.repeat(depth)}<${tag}${attrs}>${inlineInnerHTML(node)}</${tag}>\n`;
        }

        // Empty element
        if (!node.firstChild) return `${tab.repeat(depth)}<${tag}${attrs}></${tag}>\n`;

        // If element is exactly <tag><br></tag>, keep compact
        if (
          node.childNodes.length === 1 &&
          node.firstChild.nodeType === Node.ELEMENT_NODE &&
          node.firstChild.tagName.toLowerCase() === "br"
        ) {
          return `${tab.repeat(depth)}<${tag}${attrs}><br></${tag}>\n`;
        }

        // Default block formatting
        let out = `${tab.repeat(depth)}<${tag}${attrs}>\n`;
        for (const child of node.childNodes) out += formatNode(child, depth + 1);
        out += `${tab.repeat(depth)}</${tag}>\n`;
        return out;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const raw = node.nodeValue || "";

        // Drop whitespace-only nodes (these are what create blank lines in callouts/tables)
        if (/^[ \t\r\n]+$/.test(raw)) return "";

        const text = normalizeText(raw).trim();
        if (!text) return "";

        // Text nodes in block context should be indented and end with newline
        return `${tab.repeat(depth)}${escapeText(text)}\n`;
      }

      if (node.nodeType === Node.COMMENT_NODE) {
        const text = (node.nodeValue || "").trim();
        return `${tab.repeat(depth)}<!-- ${text} -->\n`;
      }

      return "";
    }

    let result = "";
    for (const child of tpl.content.childNodes) result += formatNode(child, 0);
    return result.trim();
  } catch {
    return html;
  }
}

console.log(prettyHtml(exported));


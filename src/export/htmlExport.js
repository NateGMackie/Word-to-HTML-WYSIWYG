// src/export/htmlExport.js
import { $generateHtmlFromNodes } from "@lexical/html";

/**
 * Export Lexical editor content to clean, contract-friendly HTML.
 * - Does NOT prettify (that’s the HTML panel’s job / golden runner).
 * - Does normalize semantics so we don’t bake quirks into downstream HTML.
 */
export function exportHtmlFromEditor(editor) {
  const rawHtml = $generateHtmlFromNodes(editor);
  return cleanAndNormalizeExportHtml(rawHtml);
}

export function cleanAndNormalizeExportHtml(rawHtml) {
  const html = rawHtml || "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // --- policy ---
  const ALLOWED_TAGS = new Set([
    "h1",
    "h2",
    "h3",
    "p",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "div",
    "span",
    "strong",
    "em",
    "u",
    "s",
    "sub",
    "sup",
    "a",
    "br",
    "hr",
    "img",
    "table",
    "tr",
    "th",
    "td",
  ]);

  const VOID_TAGS = new Set(["br", "hr", "img"]);
  const ALLOWED_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);
  const ALLOWED_SPAN_CLASSES = new Set(["user-input", "variable"]);
  const ALLOWED_IMG_CLASSES = new Set(["screenshot", "icon"]);
  const CALLOUT_KINDS = new Set(["note", "example", "warning"]);

  function isAnchorHref(href) {
    return typeof href === "string" && href.startsWith("#");
  }

  function isAllowedUrl(href) {
    try {
      if (!href) return false;
      if (isAnchorHref(href)) return true;
      const u = new URL(href, "https://example.com"); // base for relative
      return ALLOWED_LINK_SCHEMES.has(u.protocol);
    } catch {
      return false;
    }
  }

  function unwrapElement(el) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    el.remove();
  }

  function setAttrsInAlphaOrder(el, entries) {
    // wipe first
    for (const { name } of Array.from(el.attributes)) {
      el.removeAttribute(name);
    }
    // set sorted
    entries
      .filter((e) => e && e.value !== null && e.value !== undefined && e.value !== "")
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(({ name, value }) => el.setAttribute(name, value));
  }

  function normalizeEmptyParagraph(p) {
    const text = (p.textContent || "").replace(/\u00A0/g, " ").trim();
    const onlyBr =
      p.childNodes.length === 1 &&
      p.firstChild?.nodeType === Node.ELEMENT_NODE &&
      p.firstChild.tagName.toLowerCase() === "br";

    if (onlyBr) return;

    // truly empty: <p></p> -> <p><br></p>
    if (text === "" && p.querySelectorAll("*").length === 0) {
      p.innerHTML = "<br>";
      return;
    }

    // whitespace-only / &nbsp; / <br> combos -> <p><br></p>
    if (text === "" && p.innerHTML.replace(/&nbsp;|\s|<br\s*\/?>/gi, "").trim() === "") {
      p.innerHTML = "<br>";
    }
  }

  function normalizePre(pre) {
    // <pre><code>...</code></pre> -> <pre>...</pre>
    const code = pre.querySelector(":scope > code");
    if (code) {
      pre.textContent = code.textContent || "";
    }

    // Strip any markup inside pre (plain text only)
    pre.textContent = pre.textContent || "";

    // Only allow optional spellcheck="false" (keep if already correct)
    const sc = pre.getAttribute("spellcheck");
    const attrs = [];
    if (sc === "false") attrs.push({ name: "spellcheck", value: "false" });
    setAttrsInAlphaOrder(pre, attrs);
  }

  function normalizeSpan(span) {
    const cls = (span.getAttribute("class") || "")
      .split(/\s+/)
      .filter(Boolean)
      .filter((t) => ALLOWED_SPAN_CLASSES.has(t));

    const attrs = [];
    if (cls.length) attrs.push({ name: "class", value: cls[0] }); // exactly one token
    setAttrsInAlphaOrder(span, attrs);
  }

  function normalizeImg(img) {
    const src = img.getAttribute("src");
    if (!src) {
      img.remove();
      return;
    }

    const cls = (img.getAttribute("class") || "")
      .split(/\s+/)
      .filter(Boolean)
      .filter((t) => ALLOWED_IMG_CLASSES.has(t));

    const attrs = [
      { name: "alt", value: img.getAttribute("alt") || null },
      { name: "class", value: cls.length ? cls[0] : null },
      { name: "height", value: img.getAttribute("height") || null },
      { name: "src", value: src },
      { name: "width", value: img.getAttribute("width") || null },
    ];
    setAttrsInAlphaOrder(img, attrs);
  }

  function normalizeLink(a) {
    const href = a.getAttribute("href") || "";
    if (!isAllowedUrl(href)) {
      // disallowed scheme: unwrap link, keep text
      unwrapElement(a);
      return;
    }

    const attrs = [{ name: "href", value: href }];

    if (isAnchorHref(href)) {
      // anchors: strip rel/target
      setAttrsInAlphaOrder(a, attrs);
      return;
    }

    // external: default target/rel
    const target = a.getAttribute("target") || "_blank";
    if (target === "_blank") {
      attrs.push({ name: "rel", value: "noopener noreferrer" });
      attrs.push({ name: "target", value: "_blank" });
    } else {
      // allow non-_blank target if it exists
      attrs.push({ name: "target", value: target });
    }

    setAttrsInAlphaOrder(a, attrs);
  }

  function normalizeCalloutDiv(div) {
    const clsTokens = (div.getAttribute("class") || "")
      .split(/\s+/)
      .filter(Boolean);

    const hasCallout = clsTokens.includes("callout");
    const kind = clsTokens.find((t) => CALLOUT_KINDS.has(t));

    // Only keep class if valid callout
    if (!(hasCallout && kind)) {
      setAttrsInAlphaOrder(div, []); // remove class
      return;
    }

    setAttrsInAlphaOrder(div, [{ name: "class", value: `callout ${kind}` }]);

    // Label salvage BEFORE pruning:
    // If there's a direct <strong> sibling (bad structure), move it into the first <p>
    if (kind === "note" || kind === "example") {
      const firstP = div.querySelector(":scope > p");
      const strongSibling = Array.from(div.childNodes).find(
        (n) => n.nodeType === Node.ELEMENT_NODE && n.tagName.toLowerCase() === "strong",
      );
      if (strongSibling && firstP) {
        firstP.insertBefore(strongSibling, firstP.firstChild);
      }
    }

    // Enforce allowed children in callout:
    // allowed: p, ul, ol
    // forbidden: headings, table, img, pre, blockquote, other callouts
    Array.from(div.children).forEach((child) => {
      const tag = child.tagName.toLowerCase();
      if (tag === "p" || tag === "ul" || tag === "ol") return;
      child.remove();
    });

    // If a label exists in first <p>, normalize it to NBSP
    // (do NOT auto-add labels; only normalize when present)
    if (kind === "note" || kind === "example") {
      const firstP = div.querySelector(":scope > p");
      if (!firstP) return;

      const strong = firstP.querySelector(":scope > strong");
      if (strong) {
        const label = (strong.textContent || "").trim();
        if (label === "Note:" || label === "Example:") {
          strong.textContent = `${label}\u00A0`; // NBSP
        }
      }
    }
  }

  function normalizeTableStructure(table) {
    // strip colgroup/col/tbody/thead/tfoot but keep their contents
    table.querySelectorAll("colgroup, col, tbody, thead, tfoot").forEach((el) => {
      if (el.tagName.toLowerCase() === "col") {
        el.remove();
      } else {
        unwrapElement(el);
      }
    });

    // No attributes on table/tr
    setAttrsInAlphaOrder(table, []);
    table.querySelectorAll("tr").forEach((tr) => setAttrsInAlphaOrder(tr, []));

    // td/th: allow colspan/rowspan only; wrap direct text in <p>
    table.querySelectorAll("td, th").forEach((cell) => {
      const colspan = cell.getAttribute("colspan");
      const rowspan = cell.getAttribute("rowspan");

      setAttrsInAlphaOrder(cell, [
        { name: "colspan", value: colspan || null },
        { name: "rowspan", value: rowspan || null },
      ]);

      // Wrap direct text nodes into a <p>
      const hasDirectText = Array.from(cell.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.nodeValue || "").trim() !== "",
      );

      if (hasDirectText) {
        const p = doc.createElement("p");

        Array.from(cell.childNodes).forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE) {
            const t = n.nodeValue || "";
            if (t.trim() !== "") p.appendChild(doc.createTextNode(t.trim()));
            n.remove();
          }
        });

        if ((p.textContent || "").trim() !== "") {
          cell.insertBefore(p, cell.firstChild);
        }
      }
    });
  }

  function stripAttrsGeneric(el) {
    // Remove style and data-* always
    for (const { name } of Array.from(el.attributes)) {
      if (name === "style" || name.startsWith("data-")) el.removeAttribute(name);
    }
  }

  function sanitizeNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      // Drop the element but keep its children/text
      unwrapElement(node);
      return;
    }
// --- unwrap Word "pre-wrap" spans BEFORE we strip style attributes ---
// Fixture: 007_inline_normalization/061_strip_pre_wrap_span
if (tag === "span") {
  const style = node.getAttribute("style") || "";

  // Only unwrap when the *only* attribute is style (so we don't unwrap semantic spans)
  if (
    node.attributes.length === 1 &&
    node.hasAttribute("style") &&
    /white-space\s*:\s*pre-wrap/i.test(style)
  ) {
    const kids = Array.from(node.childNodes);
    unwrapElement(node);          // <-- your helper already exists in this file
    kids.forEach(sanitizeNode);   // sanitize children now that they're moved up
    return;
  }
}

    stripAttrsGeneric(node);

    // Per-tag rules
    if (tag === "p") {
      normalizeEmptyParagraph(node);
      setAttrsInAlphaOrder(node, []);
    }

    if (tag === "pre") normalizePre(node);
    if (tag === "span") normalizeSpan(node);

    if (tag === "img") {
      normalizeImg(node);
      return; // might remove
    }

    if (tag === "a") {
      normalizeLink(node);
      return; // might unwrap/remove attrs
    }

    if (tag === "div") normalizeCalloutDiv(node);
    if (tag === "table") normalizeTableStructure(node);

    // default attribute stripping for other tags (no attrs allowed)
    if (
      tag === "h1" ||
      tag === "h2" ||
      tag === "h3" ||
      tag === "ul" ||
      tag === "ol" ||
      tag === "li" ||
      tag === "blockquote" ||
      tag === "strong" ||
      tag === "em" ||
      tag === "u" ||
      tag === "s" ||
      tag === "sub" ||
      tag === "sup" ||
      tag === "br" ||
      tag === "hr" ||
      tag === "tr" ||
      tag === "th" ||
      tag === "td"
    ) {
      // th/td are already handled in normalizeTableStructure, but harmless to keep consistent
      // (colspan/rowspan will be re-applied in normalizeTableStructure anyway)
      if (tag !== "th" && tag !== "td") setAttrsInAlphaOrder(node, []);
    }

    // recurse children (copy array first because we may unwrap/remove)
    Array.from(node.childNodes).forEach(sanitizeNode);

    // Normalize void tags to have no children
    if (VOID_TAGS.has(tag)) {
      while (node.firstChild) node.removeChild(node.firstChild);
    }
  }

  // Remove unsafe nodes outright
  doc.querySelectorAll("style, script, meta, link").forEach((el) => el.remove());

  // sanitize all nodes in body
  Array.from(doc.body.childNodes).forEach(sanitizeNode);

  // Post-pass: unwrap redundant spans (pure wrappers) using this doc (not global document)
  let out = doc.body.innerHTML.trim();
  out = unwrapRedundantSpans(out, doc);
  return out;
}

/**
 * Unwrap spans that are pure wrappers (no attributes) and drop empty spans,
 * but never touch spans inside <pre>/<code>.
 *
 * Accepts a DOM document to avoid relying on global `document` (works in Node/JSDOM too).
 */
function unwrapRedundantSpans(html, domDoc) {
  try {
    const d = domDoc || new DOMParser().parseFromString(html, "text/html");
    const tpl = d.createElement("template");
    tpl.innerHTML = html;

    tpl.content.querySelectorAll('span').forEach((span) => {
  // Never touch spans inside code/pre (whitespace can matter)
  // ✅ Targeted unwrap for "pre-wrap" spans (fixture 061 expects this)
const style = (span.getAttribute("style") || "").toLowerCase();
const cls = (span.getAttribute("class") || "").toLowerCase();

// common Word/HTML paste artifacts
const looksPreWrap =
  style.includes("white-space: pre-wrap") ||
  style.includes("white-space:pre-wrap") ||
  cls.includes("mso-spacerun") ||
  cls.includes("apple-converted-space");

if (looksPreWrap) {
  const parent = span.parentNode;
  if (parent) {
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    span.remove();
  }
  return;
}

  if (span.closest('pre, code')) return;

  const hasAttrs = span.attributes && span.attributes.length > 0;
  const text = (span.textContent || '').replace(/\u00A0/g, ' ').trim(); // nbsp -> space

  // Drop truly empty spans
  if (!hasAttrs && text === '' && span.children.length === 0) {
    span.remove();
    return;
  }

});


    return tpl.innerHTML;
  } catch {
    return html;
  }
}

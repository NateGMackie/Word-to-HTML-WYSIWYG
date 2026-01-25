// src/import/htmlImport.js
// Word → Clean HTML pipeline (lifted from your working prototype)

// --- Parse into a separate DOM document ---
function parseHTML(input) {
  const parser = new DOMParser();
  return parser.parseFromString(input, "text/html");
}

function removeHtmlComments(doc) {
  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.remove());
}

function removeOfficeNamespaces(doc) {
  Array.from(doc.getElementsByTagName("*")).forEach((el) => {
    const tn = el.tagName;
    const idx = tn.indexOf(":");
    if (idx > 0) {
      const prefix = tn.slice(0, idx).toLowerCase();
      if (["o", "v", "w", "m"].includes(prefix)) el.remove();
    }
  });
}

function removeDangerousNodes(doc) {
  doc.querySelectorAll("style,meta,link,script,xml").forEach((el) => el.remove());
}

// Strip Word “review comments” artifacts
function removeWordComments(doc) {
  doc
    .querySelectorAll(
      [
        "span.MsoCommentReference",
        'a[style*="mso-comment-reference"]',
        'a[href^="#_msocom_"]',
        'a[name^="_msocom_"]',
        'a[href^="#cmnt"]',
      ].join(",")
    )
    .forEach((n) => {
      const p = n.parentElement;
      n.remove();
      if (p && p.tagName === "SUP" && p.textContent.trim() === "") p.remove();
    });

  doc
    .querySelectorAll(
      [
        "div.MsoCommentText",
        "style#msocomments",
        "[id^=\"_com_\"]",
        "[id^=\"cmnt\"]",
      ].join(",")
    )
    .forEach((n) => n.remove());

  doc.querySelectorAll("hr.msocomoff, hr[id^=\"_com_\"], hr[id^=\"msocom\"]").forEach((hr) => {
    const p = hr.parentElement;
    hr.remove();
    if (p && p.textContent.trim() === "" && p.children.length === 0) p.remove();
  });

  doc.querySelectorAll("p").forEach((p) => {
    if (/^\s*Comment\s*\[[^\]]+\]\s*:/.test(p.textContent || "")) p.remove();
  });
}

function convertMsoHeadings(doc) {
  doc.querySelectorAll('p[class^="MsoHeading"]').forEach((p) => {
    const m = /MsoHeading([1-6])/.exec(p.className || "");
    if (m) {
      const h = doc.createElement("h" + m[1]);
      h.innerHTML = p.innerHTML;
      p.replaceWith(h);
    }
  });
}

function normalizeInlineFormatting(doc) {
  doc.querySelectorAll("b").forEach((b) => {
    const strong = doc.createElement("strong");
    strong.innerHTML = b.innerHTML;
    b.replaceWith(strong);
  });
  doc.querySelectorAll("i").forEach((i) => {
    const em = doc.createElement("em");
    em.innerHTML = i.innerHTML;
    i.replaceWith(em);
  });
}

function normalizeInlineSpacing(doc) {
  const inline = "strong,em,u,s,sub,sup,span,a";
  doc.querySelectorAll(inline).forEach((el) => {
    // If the element ends with a space and next text starts immediately, move the space outside.
    const last = el.lastChild;
    const next = el.nextSibling;

    if (last?.nodeType === Node.TEXT_NODE && / $/.test(last.nodeValue || "")) {
      if (next?.nodeType === Node.TEXT_NODE && /^\S/.test(next.nodeValue || "")) {
        last.nodeValue = (last.nodeValue || "").replace(/ $/, "");
        next.nodeValue = " " + next.nodeValue;
      }
    }
  });
}

function normalizeWordEscapes(html) {
  if (!html) return html;

  // Word/Windows-1252 artifacts that sometimes come through as literal backslash codes.
  // \92 is the big one: right single quote (apostrophe).
  return html
    .replace(/\\92/g, "'")   // item\92s -> item's
    .replace(/\\91/g, "'")   // left single quote -> '
    .replace(/\\93/g, '"')   // left double quote -> "
    .replace(/\\94/g, '"')   // right double quote -> "
    .replace(/\\96/g, "-")   // en dash -> -
    .replace(/\\97/g, "--"); // em dash -> --
}

// ===== Extra normalization for modern Word / Word Online HTML =====

// 1) Turn <p role="heading" aria-level="1"> into <h1>, etc.
function normalizeWordOnlineHeadings(doc) {
  doc.querySelectorAll('p[role="heading"][aria-level]').forEach((p) => {
    const level = parseInt(p.getAttribute("aria-level"), 10);
    if (!level || level < 1 || level > 6) return;

    const h = doc.createElement("h" + level);
    h.innerHTML = p.innerHTML;
    p.replaceWith(h);
  });
}

function ensureInDocAnchorTargets(doc) {
  // Collect in-doc href targets: "#foo"
  const targets = new Set();
  doc.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = (a.getAttribute("href") || "").trim();
    if (href.length > 1) targets.add(href.slice(1));
  });

  const hasId = (id) => !!doc.getElementById(id);

  // Normalize helper: "_This_is_the" -> ["this","is","the"]
  const tokensFromId = (id) =>
    id
      .replace(/^_+/, "")
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase());

  const textTokens = (el) =>
    (el.textContent || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));

  targets.forEach((id) => {
    if (hasId(id)) return;

    const wanted = tokensFromId(id);
    if (!wanted.length) return;

    // Find the first heading whose first N words match the id tokens
    const match = headings.find((h) => {
      const tt = textTokens(h);
      if (tt.length < wanted.length) return false;
      for (let i = 0; i < wanted.length; i++) {
        if (tt[i] !== wanted[i]) return false;
      }
      return true;
    });

    if (match) {
      match.setAttribute("id", id);
      return;
    }

    // Fallback: insert a marker at the top of the document
    const marker = doc.createElement("span");
    marker.setAttribute("id", id);
    doc.body.insertBefore(marker, doc.body.firstChild);
  });
}


function normalizeLinks(doc) {
  const allowedSchemes = new Set(["http:", "https:", "mailto:"]);

  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = (a.getAttribute("href") || "").trim();

    // Empty href => unwrap
    if (!href) {
      a.replaceWith(...a.childNodes);
      return;
    }

    // Pure in-doc anchors => keep only href
    if (href.startsWith("#")) {
      Array.from(a.attributes).forEach((attr) => {
        if (attr.name !== "href") a.removeAttribute(attr.name);
      });
      return;
    }

        // Word "bookmark://Some_Target" => treat as in-doc anchor "#Some_Target"
    if (/^bookmark:\/\//i.test(href)) {
      const raw = href.replace(/^bookmark:\/\//i, "");
      const target = raw.trim();
      if (!target) {
        a.replaceWith(...a.childNodes);
        return;
      }

      a.setAttribute("href", "#" + target);

      // Keep only href (in-doc anchor)
      Array.from(a.attributes).forEach((attr) => {
        if (attr.name !== "href") a.removeAttribute(attr.name);
      });
      return;
    }


    // Convert file/about links that include a hash into hash-only anchors
        const hashIndex = href.indexOf("#");
    if (hashIndex !== -1 && /^(file:|about:)/i.test(href)) {
      const frag = href.slice(hashIndex); // "#_Toc123"
      if (frag.length <= 1) {
        a.replaceWith(...a.childNodes);
        return;
      }
      a.setAttribute("href", frag);
      Array.from(a.attributes).forEach((attr) => {
        if (attr.name !== "href") a.removeAttribute(attr.name);
      });
      return;
    }


    // Parse scheme safely (supports relative links too)
    let url;
    try {
      url = new URL(href, "https://example.invalid");
    } catch {
      a.replaceWith(...a.childNodes);
      return;
    }

    // Disallowed scheme => unwrap
    if (!allowedSchemes.has(url.protocol)) {
      a.replaceWith(...a.childNodes);
      return;
    }

    // External http(s): enforce rel/target
    if (url.protocol === "http:" || url.protocol === "https:") {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } else {
      a.removeAttribute("target");
      a.removeAttribute("rel");
    }

    // Strip unknown attributes (keep href/rel/target only)
    Array.from(a.attributes).forEach((attr) => {
      if (!["href", "rel", "target"].includes(attr.name)) {
        a.removeAttribute(attr.name);
      }
    });
  });
}



// 2) Flatten wrapper divs that Word Online loves to sprinkle everywhere
function flattenWordOnlineWrappers(doc) {
  const selectors = [
    "div.OutlineElement",
    "div.ListContainerWrapper",
    "div.TableContainer",
    "div.TableCellContent",
  ];

  doc.querySelectorAll(selectors.join(",")).forEach((wrapper) => {
    const parent = wrapper.parentNode;
    if (!parent) return;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    wrapper.remove();
  });
}

function unwrapSingleRootDiv(doc) {
  const body = doc.body;
  if (!body) return;

  // element children only (ignore whitespace text nodes)
  const kids = Array.from(body.children);
  if (kids.length !== 1) return;

  const root = kids[0];
  if (root.tagName.toLowerCase() !== "div") return;

  const cls = (root.getAttribute("class") || "").trim();

  // Never unwrap meaningful divs (contract structures)
  if (/\bcallout\b/i.test(cls)) return;

  // If Word put a wrapper around everything, unwrap it.
  // Common desktop export wrapper is "WordSection1".
  const looksLikeWordWrapper =
    cls === "" ||
    /\bWordSection\d*\b/i.test(cls) ||
    /\bSection\d*\b/i.test(cls);

  if (!looksLikeWordWrapper) return;

  // If it has meaningful attributes beyond Word noise, keep it.
  const allowedWrapperAttrs = new Set(["class", "style", "lang", "dir", "id"]);
  const hasMeaningfulAttr = Array.from(root.attributes).some(
    (a) => !allowedWrapperAttrs.has(a.name.toLowerCase())
  );
  if (hasMeaningfulAttr) return;

  // Unwrap: move children to body, remove wrapper
  while (root.firstChild) body.insertBefore(root.firstChild, root);
  root.remove();
}

function normalizeWordSemanticSpans(doc) {
  doc.querySelectorAll("span").forEach((span) => {
    const cls = (span.getAttribute("class") || "").trim();
    const clsLower = cls.toLowerCase();

    const ccp =
      (span.getAttribute("data-ccp-charstyle") ||
        span.getAttribute("data-ccp-char-style") ||
        "").trim().toLowerCase();

    // Class-based (desktop / macro Word)
    if (clsLower === "userinput") {
      span.setAttribute("class", "user-input");
      return;
    }
    if (clsLower === "userinputvariable") {
      span.setAttribute("class", "variable");
      return;
    }

    // Word Web / Word Online often uses data-ccp-charstyle
    if (ccp.includes("userinputvariable") || ccp.includes("user input variable")) {
      span.setAttribute("class", "variable");
      return;
    }
    if (ccp.includes("userinput") || ccp.includes("user input")) {
      span.setAttribute("class", "user-input");
      return;
    }
  });
}


// 3) Strip non-content attributes (classes, inline styles, data-*, etc.)
//    but KEEP things that matter for content: href, src, alt, colspan, etc.
function stripNonContentAttributes(doc) {
  const keep = new Set([
    "id",
    "href",
    "rel",
    "src",
    "alt",
    "colspan",
    "rowspan",
    "scope",
    "title",
    "target",
    "start",
    "type",
    "class", // handled with rules below
  ]);

  const allowedCalloutKinds = new Set(["note", "warning", "example"]);
  const allowedSpanClasses = new Set(["user-input", "variable"]);
  const allowedImgClasses = new Set(["screenshot", "icon"]); // optional, per contract

  const isAllowedCalloutClass = (el) => {
    if (el.tagName.toLowerCase() !== "div") return false;
    const cls = (el.getAttribute("class") || "").trim().toLowerCase();
    if (!cls) return false;

    const parts = cls.split(/\s+/).filter(Boolean);
    if (!parts.includes("callout")) return false;

    const kind = parts.find((p) => p !== "callout");
    return !!kind && allowedCalloutKinds.has(kind);
  };

  const isAllowedSemanticSpanClass = (el) => {
    if (el.tagName.toLowerCase() !== "span") return false;
    const cls = (el.getAttribute("class") || "").trim().toLowerCase();
    return allowedSpanClasses.has(cls);
  };

  const isAllowedImgClass = (el) => {
    if (el.tagName.toLowerCase() !== "img") return false;
    const cls = (el.getAttribute("class") || "").trim().toLowerCase();
    if (!cls) return false;
    // allow a single token for now
    return allowedImgClasses.has(cls);
  };

  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();

      if (!keep.has(name)) {
        el.removeAttribute(attr.name);
        return;
      }

      if (name === "class") {
        const ok =
          isAllowedCalloutClass(el) ||
          isAllowedSemanticSpanClass(el) ||
          isAllowedImgClass(el);

        if (!ok) el.removeAttribute("class");
      }
    });
  });
}



// 4) After attributes are stripped, a ton of <span> wrappers become useless.
//    Unwrap <span> elements that have no attributes.
function unwrapEmptySpans(doc) {
  doc.querySelectorAll("span").forEach((span) => {
    if (span.attributes.length === 0) {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      span.remove();
    }
  });
}

// 5) Kill empty paragraphs that just contain &nbsp; / whitespace.
function removeEmptyParagraphs(doc) {
  doc.querySelectorAll("p").forEach((p) => {
    const text = (p.textContent || "").replace(/\u00A0/g, " ").trim();
    const hasMeaningfulNodes = Array.from(p.childNodes).some((n) => {
      if (n.nodeType === Node.ELEMENT_NODE) return n.tagName.toLowerCase() !== "o:p";
      if (n.nodeType === Node.TEXT_NODE) return n.nodeValue.replace(/\u00A0/g, " ").trim().length > 0;
      return false;
    });

    if (!hasMeaningfulNodes || text === "") {
      p.innerHTML = "<br>";
    }
  });
}

// Turn Word/Word Online style-based formatting into semantic tags
function applyInlineStyleFormatting(doc) {
  doc.querySelectorAll("span[style]").forEach((span) => {
    // ✅ Skip semantic spans (keep user-input / variable intact)
    const cls = (span.getAttribute("class") || "").toLowerCase().trim();
    if (
      cls === "user-input" ||
      cls === "variable" ||
      cls === "userinput" ||
      cls === "userinputvariable"
    ) {
      return;
    }

    const style = (span.getAttribute("style") || "").toLowerCase();
    if (!style) return;

    const isBold = /font-weight\s*:\s*(bold|[7-9]00)/.test(style);
    const isItalic = /font-style\s*:\s*italic/.test(style);
    const hasUnderline = /text-decoration[^;]*underline/.test(style);
    const hasStrike = /text-decoration[^;]*(line-through|strikethrough)/.test(style);
    const isSup = /vertical-align\s*:\s*(super|superscript)/.test(style);
    const isSub = /vertical-align\s*:\s*sub/.test(style);

    if (!(isBold || isItalic || hasUnderline || hasStrike || isSup || isSub)) return;

    let node = span;

    const wrap = (tagName) => {
      const wrapper = doc.createElement(tagName);
      while (node.firstChild) wrapper.appendChild(node.firstChild);
      node.parentNode.insertBefore(wrapper, node);
      node.remove();
      node = wrapper;
    };

    if (isBold) wrap("strong");
    if (isItalic) wrap("em");
    if (hasUnderline) wrap("u");
    if (hasStrike) wrap("s");
    if (isSup) wrap("sup");
    if (isSub) wrap("sub");
  });
}



// Remove Word's Mso* classes and mso-* inline styles (run AFTER list/heading detection!)
function removeMsoStyling(doc) {
  doc.querySelectorAll("[class]").forEach((el) => {
    const kept = (el.className || "")
      .split(/\s+/)
      .filter(Boolean)
      .filter((c) => !/^mso/i.test(c));
    if (kept.length) el.className = kept.join(" ");
    else el.removeAttribute("class");
  });

  doc.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style") || "";
    const kept = style
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((rule) => {
        const name = (rule.split(":")[0] || "").trim().toLowerCase();
        return (
          name &&
          !name.startsWith("mso-") &&
          !name.startsWith("-mso-") &&
          name !== "tab-stops" &&
          name !== "page-break-before" &&
          name !== "page-break-after"
        );
      });

    if (kept.length) el.setAttribute("style", kept.join("; "));
    else el.removeAttribute("style");
  });
}

function olTypeFromStyleType(styleType) {
  const v = (styleType || "").toLowerCase();
  if (v === "lower-alpha") return "a";
  if (v === "upper-alpha") return "A";
  if (v === "lower-roman") return "i";
  if (v === "upper-roman") return "I";
  return null; // decimal/default
}

function styleTypeFromOlType(typeAttr) {
  const t = (typeAttr || "").trim();
  if (t === "a") return "lower-alpha";
  if (t === "A") return "upper-alpha";
  if (t === "i") return "lower-roman";
  if (t === "I") return "upper-roman";
  return null;
}

function getListInfo(p) {
  const cls = p.className || "";
  const styleRaw = p.getAttribute("style") || "";
  const style = styleRaw.toLowerCase();
  const text = (p.textContent || "").trim();

  const hasWordFlag = /mso-list/.test(style) || /MsoListParagraph/i.test(cls);

  let listId = null;
  let level = null;

  // track whether Word gave us a real level
  let explicitLevel = false;

  const mWord = /mso-list:\s*l(\d+)\s+level(\d+)/i.exec(styleRaw);
  if (mWord) {
    listId = Number(mWord[1]);
    level = Math.max(1, parseInt(mWord[2], 10));
    explicitLevel = true;
  }

  // Fallback: "levelN" elsewhere
  if (level == null) {
    const mLevel = /level\s*([0-9]+)/i.exec(styleRaw);
    if (mLevel) {
      level = Math.max(1, parseInt(mLevel[1], 10));
      explicitLevel = true;
    }
  }

    // ✅ NEW: infer nesting from indentation when Word didn't provide a level
if (level == null) {
  const readLenPx = (prop) => {
    // 1) Prefer the parsed inline style (browser normalizes units better)
    const direct = (p.style && (p.style[prop] || p.style.getPropertyValue(prop))) || "";
    if (direct) {
      const m = /(-?[\d.]+)\s*(px|pt|in|cm|mm)?/i.exec(direct.trim());
      if (m) {
        const v = parseFloat(m[1]);
        const unit = (m[2] || "px").toLowerCase();
        if (Number.isFinite(v)) {
          if (unit === "px") return v;
          if (unit === "pt") return v * (96 / 72);
          if (unit === "in") return v * 96;
          if (unit === "cm") return v * (96 / 2.54);
          if (unit === "mm") return v * (96 / 25.4);
          return v;
        }
      }
    }

    // 2) Fallback: regex parse from raw style string
    const re = new RegExp(`${prop}\\s*:\\s*(-?[\\d.]+)\\s*(pt|px|in|cm|mm)`, "i");
    const m = re.exec(styleRaw);
    if (!m) return null;

    const v = parseFloat(m[1]);
    const unit = (m[2] || "px").toLowerCase();
    if (!Number.isFinite(v)) return null;

    if (unit === "px") return v;
    if (unit === "pt") return v * (96 / 72);
    if (unit === "in") return v * 96;
    if (unit === "cm") return v * (96 / 2.54);
    if (unit === "mm") return v * (96 / 25.4);
    return v;
  };

  const ml = readLenPx("marginLeft") ?? readLenPx("margin-left") ?? 0;
  const pl = readLenPx("paddingLeft") ?? readLenPx("padding-left") ?? 0;
  const ti = readLenPx("textIndent") ?? readLenPx("text-indent") ?? 0;

  // Hanging indents are usually negative; don’t let them erase nesting.
  const indentPx = ml + pl + Math.max(0, ti);

  // Word commonly nests by ~18pt (~24px). Keep your tuning.
  const PX_PER_LEVEL = 24;
  const THRESHOLD = 8;

  let inferred = 1;
  if (indentPx > THRESHOLD) {
    inferred = 1 + Math.floor((indentPx + PX_PER_LEVEL * 0.4) / PX_PER_LEVEL);
  }

  level = Math.max(1, Math.min(6, inferred));
  // NOTE: explicitLevel stays false on purpose
}



  if (level == null) level = 1;

  // bullet detection tweak: allow "o " as a bullet marker (common in Word HTML)
  const bulletRe = /^(?:[\u2022\u00B7\u2219\u25AA\u25CF\-*]|o(?=\s))/;
  const orderedRe = /^(?:\d+|[A-Za-z]+|[ivxlcdm]+)[.)]/i;
  if (!(hasWordFlag || bulletRe.test(text) || orderedRe.test(text))) return null;

  const type = bulletRe.test(text) ? "ul" : "ol";

  let styleType = null;
  if (type === "ol") {
    if (/^[a-z][.)]/.test(text)) styleType = "lower-alpha";
    else if (/^[A-Z][.)]/.test(text)) styleType = "upper-alpha";
    else if (/^(?:[ivxlcdm]+)[.)]/i.test(text)) styleType = "lower-roman";
  }

  if (type === "ul" && !explicitLevel) {
  level = 1;
}

  return { type, level, styleType, listId, explicitLevel };
}


function stripListMarkersDOM(p) {
  // 1) Remove Word marker helper spans everywhere in <p>
  p.querySelectorAll("span").forEach((s) => {
    const st = (s.getAttribute("style") || "").toLowerCase();
    const onlyNbsp =
      !s.firstElementChild && /^\s*&nbsp;*\s*$/i.test(s.innerHTML);
    if (
      /mso-list\s*:\s*ignore/.test(st) ||
      (/font-size:\s*7pt/.test(st) && onlyNbsp)
    ) {
      s.remove();
    }
  });

  // Bullet or number/alpha/roman (optional "("), then "." or ")"
  const markerRE =
  /^(?:[\u2022\u00B7\u2219\u25AA\u25CF\-*]|o(?=\s)|(?:\(?(?:\d+|[A-Za-z]+|[ivxlcdm]+)[.)]))\s*/i;

  function trimFromNode(node) {
    if (!node) return false;

    if (node.nodeType === Node.TEXT_NODE) {
      const txt = (node.nodeValue || "").replace(/\u00A0/g, " ");
      const m = txt.match(markerRE);
      if (m) {
        const rest = txt.slice(m[0].length).replace(/^\s+/, "");
        if (rest.length) {
          node.nodeValue = rest;
        } else {
          // If nothing left, drop this text node entirely
          node.parentNode && node.parentNode.removeChild(node);
        }
        return true;
      }
      return false;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      // Try to trim inside the first descendant text node
      for (let c = node.firstChild; c; c = c.nextSibling) {
        // ditch leading pure-whitespace text nodes as we go
        if (
          c.nodeType === Node.TEXT_NODE &&
          /^\s*$/.test((c.nodeValue || "").replace(/\u00A0/g, " "))
        ) {
          const next = c.nextSibling;
          node.removeChild(c);
          c = next ? next.previousSibling : null;
          continue;
        }
        if (trimFromNode(c)) {
          // After trimming, drop any leading 7pt NBSP spacer span(s)
          while (node.firstChild && node.firstChild.nodeType === Node.ELEMENT_NODE) {
            const el = node.firstChild;
            const st = (el.getAttribute("style") || "").toLowerCase();
            if (
              el.tagName === "SPAN" &&
              /font-size:\s*7pt/.test(st) &&
              /^\s*&nbsp;*\s*$/i.test(el.innerHTML)
            ) {
              node.removeChild(el);
              continue;
            }
            break;
          }
          return true;
        }
      }
    }
    return false;
  }

  // Work from the very start of <p>, descending into anchors/spans if needed
  trimFromNode(p.firstChild);

  return p.innerHTML.trim();
}

function unwrapParasInListItems(doc) {
  doc.querySelectorAll('li > p:first-child').forEach(p => {
    const li = p.parentElement;
    if (!li) return;

    // If the <p> contains block-level elements, leave it alone.
    const hasBlockChild = Array.from(p.children).some(child =>
      ["P", "DIV", "UL", "OL", "TABLE"].includes(child.tagName)
    );
    if (hasBlockChild) return;

    // Insert the <p>'s contents directly into the <li>,
    // before whatever comes after the <p> (e.g., a nested <ol>).
    const refNode = p.nextSibling; // may be a nested <ol>/<ul> or null
    while (p.firstChild) {
      li.insertBefore(p.firstChild, refNode);
    }
    p.remove();
  });
}


// Normalize Word Online lists (<ol>/<ul> with data-listid + data-aria-level)
// into a single semantic list with proper nesting.
function normalizeWordOnlineLists(doc) {
  const root = doc.body;
  let node = root.firstElementChild;

  // Read list-style-type from either inline style attribute or computed style string
  const readListStyleType = (el) => {
    if (!el) return "";
    // prefer explicit style attr (Word often uses inline style)
    const styleAttr = (el.getAttribute("style") || "").toLowerCase();
    const m = /list-style-type\s*:\s*([^;]+)/i.exec(styleAttr);
    if (m) return (m[1] || "").trim();
    // fallback: DOM style property (sometimes set)
    const prop = (el.style?.listStyleType || "").trim();
    return prop;
  };

  while (node) {
    const tag = node.tagName;
    if (tag !== "OL" && tag !== "UL") {
      node = node.nextElementSibling;
      continue;
    }

    // Look for a listId on the first <li>
    const firstLi = node.querySelector("li");
    const listId = firstLi && firstLi.getAttribute("data-listid");
    if (!listId) {
      node = node.nextElementSibling;
      continue;
    }

    const lists = [node];
    let cursor = node.nextElementSibling;

    const isIgnorableBetweenLists = (el) => {
      if (!el) return false;
      if (el.tagName === "BR") return true;
      if (el.tagName === "P") {
        const t = (el.textContent || "").replace(/\u00A0/g, " ").trim();
        return t === "" || el.innerHTML.trim() === "<br>";
      }
      return false;
    };

    while (cursor) {
      if (cursor.tagName !== tag) {
        if (isIgnorableBetweenLists(cursor)) {
          cursor = cursor.nextElementSibling;
          continue;
        }
        break;
      }

      const li = cursor.querySelector("li");
      const cursorListId = li && li.getAttribute("data-listid");
      if (cursorListId !== listId) break;

      lists.push(cursor);
      cursor = cursor.nextElementSibling;
    }

    const hasNestedLevels = lists.some((l) =>
      Array.from(l.querySelectorAll("li")).some((li) => {
        const levelAttr =
          li.getAttribute("data-aria-level") || li.getAttribute("aria-level");
        const level = parseInt(levelAttr || "1", 10);
        return Number.isFinite(level) && level > 1;
      })
    );

    if (lists.length > 1 || hasNestedLevels) {
      const combined = doc.createElement(tag);

      // Stack of lists by level; index = level - 1
      const listStack = [combined];

      // level -> styleType string (lower-alpha, lower-roman, etc.)
      const styleForLevel = new Map();

      const ensureLevel = (level) => {
        if (level < 1) level = 1;

        // Grow: create nested lists as needed
        while (listStack.length < level) {
          const parentList = listStack[listStack.length - 1];
          const parentLi = parentList.lastElementChild;
          if (!parentLi) break;

          const newList = doc.createElement(tag);

          // Apply <ol type="..."> for styling that survives attribute stripping
          if (tag === "OL") {
            const st = styleForLevel.get(listStack.length + 1); // level we are creating
            const typeAttr = olTypeFromStyleType(st);
            if (typeAttr) newList.setAttribute("type", typeAttr);
          }

          parentLi.appendChild(newList);
          listStack.push(newList);
        }

        // Shrink: pop back to the requested level
        while (listStack.length > level) listStack.pop();
      };

      // Walk all lis in DOM order across the sequence
      lists.forEach((ol) => {
        Array.from(ol.children).forEach((li) => {
          if (li.tagName !== "LI") return;

          const levelAttr =
            li.getAttribute("data-aria-level") || li.getAttribute("aria-level");
          let level = parseInt(levelAttr || "1", 10);
          if (!Number.isFinite(level) || level < 1) level = 1;

          // Capture style info from the source list segment at this level
          if (tag === "OL") {
            const stRaw = readListStyleType(li.parentElement);
            // normalize to our canonical names
            const st =
              stRaw === "lower-alpha" ? "lower-alpha" :
              stRaw === "upper-alpha" ? "upper-alpha" :
              stRaw === "lower-roman" ? "lower-roman" :
              stRaw === "upper-roman" ? "upper-roman" :
              null;

            if (st) styleForLevel.set(level, st);
          }

          ensureLevel(level);

          const currentList = listStack[level - 1];
          currentList.appendChild(li); // Move <li> into the combined structure
        });
      });

      // Also apply style to the top-level combined list if known
      if (tag === "OL") {
        const st1 = styleForLevel.get(1);
        const t1 = olTypeFromStyleType(st1);
        if (t1) combined.setAttribute("type", t1);
      }

      // Insert combined list before the first original list
      root.insertBefore(combined, node);

      // Remove the original segmented lists
      lists.forEach((l) => l.remove());

      // Continue from the combined structure
      node = combined;
    }

    node = node.nextElementSibling;
  }
}

function convertListsInDoc(doc) {
  const root = doc.body;
  const raw = Array.from(root.childNodes);

  // Keep only meaningful nodes (skip whitespace-only text nodes)
  const nodes = [];
  for (const n of raw) {
    if (n.nodeType === Node.TEXT_NODE) {
      if ((n.nodeValue || "").replace(/\s+/g, "") === "") continue;
    }
    nodes.push(n);
  }

  const frag = doc.createDocumentFragment();

  // Stack of open lists: [{ el, level, type, styleType, lastLi }]
  const stack = [];
  const current = () => stack[stack.length - 1];

  // Remember the most recent emitted <li> (for "carry-over" nesting)
  let lastLiGlobal = null;

  // Read list style from <ol type="a|A|i|I"> (since we strip style attrs later)
  const olStyle = (el) => {
    if (!el) return "decimal";
    const t = el.getAttribute && el.getAttribute("type");
    const st = styleTypeFromOlType(t);
    return st || "decimal";
  };

  const styleRank = (type, styleType) => {
    if (type !== "ol") return 0;
    const st = (styleType || "decimal").toLowerCase();
    if (st.includes("roman")) return 2;
    if (st.includes("alpha")) return 1;
    return 0; // decimal/default
  };

  function pushList(info, parentLi) {
    const list = doc.createElement(info.type);

    // Use <ol type="..."> instead of inline style
    if (info.type === "ol" && info.styleType) {
      const t = olTypeFromStyleType(info.styleType);
      if (t) list.setAttribute("type", t);
    }

    if (parentLi) {
      parentLi.appendChild(list);
    } else if (stack.length) {
      // attach inside the last <li> of the parent list
      let holder = current().lastLi;
      if (!holder) {
        holder = doc.createElement("li");
        current().el.appendChild(holder);
        current().lastLi = holder;
      }
      holder.appendChild(list);
    } else {
      frag.appendChild(list);
    }

    stack.push({
      el: list,
      level: info.level,
      type: info.type,
      styleType: info.styleType || null,
      lastLi: null,
    });
  }

  function closeTo(level) {
    while (stack.length && current().level > level) stack.pop();
  }

  function isTrivialParagraph(node) {
    if (!(node && node.nodeType === Node.ELEMENT_NODE && node.tagName === "P")) return false;
    const txt = (node.textContent || "").replace(/\u00A0/g, " ").trim();
    return txt === "";
  }

  function isIgnorableBetweenListItems(node) {
    if (!node) return false;

    if (node.nodeType === Node.TEXT_NODE) {
      return (node.nodeValue || "").trim() === "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    if (node.tagName === "BR") return true;

    if (node.tagName === "P") {
      const t = (node.textContent || "").replace(/\u00A0/g, " ").trim();
      return t === "" || node.innerHTML.trim().toLowerCase() === "<br>";
    }

    return false;
  }

  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];

    // List paragraphs
    if (n.nodeType === Node.ELEMENT_NODE && n.tagName === "P") {
      let info = getListInfo(n);

      if (info) {
        // If a list is open, decide nest/pop based on style rank (decimal < alpha < roman)
        if (stack.length) {
          const cur = current();

          if (
            !info.explicitLevel && // only invent nesting when we had to infer
            info.type === "ol" &&
            cur.type === "ol" &&
            info.level <= cur.level
          ) {
            const curRank = styleRank(cur.type, cur.styleType);
            const newRank = styleRank(info.type, info.styleType);
            if (newRank > curRank) {
              info.level = cur.level + 1;
            } else if (newRank < curRank) {
              info.level = Math.max(1, cur.level - 1);
            }
          }

          // clamp jumps to at most one deeper
          if (info.level > current().level + 1) info.level = current().level + 1;
        } else if (lastLiGlobal) {
          // Stack is empty but previous output was an <li>.
          const parentList = lastLiGlobal.parentElement;
          const parentIsOl = parentList && parentList.tagName === "OL";
          const parentRank = parentIsOl ? styleRank("ol", olStyle(parentList)) : 0;

          const newRank = info.type === "ol" ? styleRank("ol", info.styleType) : 0;
          const prevIntro = /[:：]\s*$/.test((lastLiGlobal.textContent || ""));

          if (info.type === "ol" && (newRank > parentRank || prevIntro)) {
  info.level = (lastLiGlobal._level || 1) + 1;
  pushList(info, lastLiGlobal);
}
        }


        
        // If level decreased, pop back
        if (stack.length && info.level < current().level) closeTo(info.level);

        if (stack.length) {
          // If same level but list type changed, pop to parent so we can start a sibling list
          if (info.level === current().level && info.type !== current().type) closeTo(info.level - 1);
        }

        // Open/continue the appropriate list at the target level
        if (!stack.length || current().level < info.level || current().type !== info.type) {
          pushList(info);
        } else if (
          current().type === "ol" &&
          (info.styleType || "decimal") !== (current().styleType || "decimal")
        ) {
          // same level but different numbering → sibling list (not nested)
          closeTo(info.level - 1);
          pushList(info);
        }

        // Emit the <li>
        const li = doc.createElement("li");
        li.innerHTML = stripListMarkersDOM(n.cloneNode(true));
        current().el.appendChild(li);
        current().lastLi = li;
        li._level = current().level;
        lastLiGlobal = li;

        i++;
        continue;
      }

      // Blank spacer paragraphs inside lists
      if (stack.length && isTrivialParagraph(n)) {
        i++;
        continue;
      }
    }

    // If we're inside a list and this node is just spacing, skip it WITHOUT closing.
    if (stack.length && isIgnorableBetweenListItems(n)) {
      i++;
      continue;
    }

    // Otherwise, meaningful non-list content closes lists and is appended once.
    closeTo(0);
    frag.appendChild(n.cloneNode(true));
    i++;
  }

  

  closeTo(0);
  root.innerHTML = "";
  root.appendChild(frag);
}

function mergeAdjacentLists(doc) {
  const isIgnorable = (node) => {
    if (!node) return false;

    // whitespace-only text
    if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue || "").trim() === "";

    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    if (node.tagName === "BR") return true;

    if (node.tagName === "P") {
      const t = (node.textContent || "").replace(/\u00A0/g, " ").trim();
      return t === "" || node.innerHTML.trim().toLowerCase() === "<br>";
    }

    return false;
  };

  const sameListKind = (a, b) => {
    if (!a || !b) return false;
    if (a.tagName !== b.tagName) return false;
    if (a.tagName === "OL") return (a.getAttribute("type") || "") === (b.getAttribute("type") || "");
    return true; // UL
  };

  // Walk every element container, not just body
  const parents = [doc.body, ...Array.from(doc.body.querySelectorAll("*"))];

  parents.forEach((parent) => {
    // We use childNodes so we can see text nodes / empty <p> between lists
    let i = 0;
    while (i < parent.childNodes.length) {
      const node = parent.childNodes[i];

      if (node?.nodeType === Node.ELEMENT_NODE && (node.tagName === "UL" || node.tagName === "OL")) {
        // Find the next *meaningful* sibling after ignorable stuff
        let j = i + 1;
        while (j < parent.childNodes.length && isIgnorable(parent.childNodes[j])) j++;

        while (j < parent.childNodes.length) {
          const next = parent.childNodes[j];

          if (!(next?.nodeType === Node.ELEMENT_NODE && (next.tagName === "UL" || next.tagName === "OL"))) break;
          if (!sameListKind(node, next)) break;

          // Move LI children over
          while (next.firstElementChild) node.appendChild(next.firstElementChild);

          // Remove the merged list
          const toRemove = next;
          // After removing, don't advance j; the list shrinks
          parent.removeChild(toRemove);

          // Skip any ignorable nodes again
          while (j < parent.childNodes.length && isIgnorable(parent.childNodes[j])) j++;
        }
      }

      i++;
    }
  });
}



function normalizeListStarts(doc) {
  doc.querySelectorAll('ol[start]').forEach(ol => {
    // if the start is 1, we don’t really need it
    const start = parseInt(ol.getAttribute('start'), 10);
    if (!Number.isNaN(start) && start === 1) {
      ol.removeAttribute('start');
    }
  });
}

function normalizeBookmarkAnchors(doc) {
  // Word exports bookmark targets as <a name="...">...</a> (often wrapping headings)
  doc.querySelectorAll("a[name]:not([href])").forEach((a) => {
    const name = (a.getAttribute("name") || "").trim();
    if (!name) {
      a.replaceWith(...a.childNodes);
      return;
    }

    // Prefer putting id on a nearby block element
    const parent = a.parentElement;
    const parentTag = parent?.tagName?.toLowerCase() || "";

    if (parent && /^h[1-6]$/.test(parentTag) && parent.firstElementChild === a) {
      parent.setAttribute("id", name);
      a.replaceWith(...a.childNodes);
      return;
    }

    // Otherwise insert a tiny anchor span
    const marker = doc.createElement("span");
    marker.setAttribute("id", name);
    a.parentNode?.insertBefore(marker, a);
    a.replaceWith(...a.childNodes);
  });
}

function flattenMhtWrapperDivs(doc) {
  // Target pattern (from .mht / saved-as-webpage outputs):
  // <div [maybe style="mso-element:para-border-div"]>
  //   <p></p>   (or nbsp)
  //   <div>...</div>
  //   <p></p>   (or nbsp)
  // </div>
  //
  // We want:
  // <div>...</div>

  const isTrulyEmptyP = (p) => {
    const html = (p.innerHTML || "").replace(/\s+/g, "").toLowerCase();
    return html === "" || html === "&nbsp;" || html === "&#160;";
  };

  const isSafeWrapperDiv = (el) => {
    if (!el || el.tagName?.toLowerCase() !== "div") return false;

    const attrs = Array.from(el.attributes || []);
    if (attrs.length === 0) return true;

    if (attrs.length === 1 && attrs[0].name.toLowerCase() === "style") {
      const s = (attrs[0].value || "").toLowerCase();
      return s.includes("mso-element:para-border-div");
    }

    return false;
  };

  doc.querySelectorAll("div").forEach((outer) => {
    if (!isSafeWrapperDiv(outer)) return;

    // Remove empty <p></p> children inside outer div
    Array.from(outer.children).forEach((child) => {
      if (child.tagName.toLowerCase() === "p" && isTrulyEmptyP(child)) {
        child.remove();
      }
    });

    // After removal, if outer contains exactly one element child and it's a div,
    // replace outer with that inner div.
    const els = Array.from(outer.children);
    if (els.length === 1 && els[0].tagName.toLowerCase() === "div") {
      const inner = els[0];

      outer.replaceWith(inner);
    }
  });
}


function normalizeId(raw) {
  let id = (raw || "").trim();
  if (!id) return "";

  // Word likes leading underscores; keep those.
  id = id.replace(/\s+/g, "_");

  // Strip unsafe chars (keep common safe set)
  id = id.replace(/[^A-Za-z0-9_\-:.]/g, "");

  // Must not start with a digit for sanity/consistency
  if (/^\d/.test(id)) id = `id_${id}`;

  // Optional: cap length to keep it reasonable
  if (id.length > 80) id = id.slice(0, 80);

  return id;
}

function dedupeIds(doc) {
  const seen = new Map(); // id -> count

  const all = doc.querySelectorAll("[id]");
  for (const el of all) {
    const current = el.getAttribute("id") || "";
    const normalized = normalizeId(current);

    if (!normalized) {
      el.removeAttribute("id");
      continue;
    }

    const count = (seen.get(normalized) || 0) + 1;
    seen.set(normalized, count);

    if (count === 1) {
      el.setAttribute("id", normalized);
    } else {
      el.setAttribute("id", `${normalized}-${count}`);
    }
  }
}

function normalizeTables(doc) {
  // Export contract wants only: table > tr > th/td
  // So we remove/unwrap structural helpers common in Word HTML:
  // thead/tbody/tfoot/colgroup/col.

  // 1) Remove colgroup/col entirely (layout-only)
  doc.querySelectorAll("table colgroup, table col").forEach((n) => n.remove());

  // 2) Unwrap thead/tbody/tfoot so their <tr> become direct children of <table>
  const unwrap = (node) => {
    const parent = node.parentNode;
    if (!parent) return;

    // Move all children before the wrapper node
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
  };

  // Unwrap in a stable order (deepest wrappers first is safest)
  // querySelectorAll returns a static NodeList, so this is safe to mutate during iteration.
  doc.querySelectorAll("table thead, table tbody, table tfoot").forEach(unwrap);
}

function stripTableBorders(doc) {
  doc.querySelectorAll("table").forEach((tbl) => tbl.removeAttribute("border"));
}

function normalizeWordParaBorderDivs(doc) {
  // Word wraps “bordered paragraphs” like:
  // <div style="mso-element:para-border-div; ...">
  //   <p class="NoteBlock|WarnBlock|ExampleBlock">...</p>
  // </div>
  //
  // We want:
  // <div>
  //   <p>...</p>
  // </div>
  //
  // (We *do not* want nested <div><div><p>... plus padding <p></p>)

  const isCalloutP = (p) => {
    const cls = (p.getAttribute("class") || "").toLowerCase();
    return cls === "noteblock" || cls === "warnblock" || cls === "exampleblock";
  };

  const hasParaBorderStyle = (div) => {
    const style = (div.getAttribute("style") || "").toLowerCase();
    return style.includes("mso-element:para-border-div");
  };

  doc.querySelectorAll("div[style]").forEach((div) => {
    if (!hasParaBorderStyle(div)) return;

    // Remove “visual” Word styles from the wrapper.
    div.removeAttribute("style");

    // If it contains exactly one paragraph and it's one of our callout styles,
    // strip its class and let later steps convert it to your clean callout HTML.
    const elementChildren = Array.from(div.children);
    if (elementChildren.length === 1 && elementChildren[0].tagName.toLowerCase() === "p") {
      const p = elementChildren[0];
      if (isCalloutP(p)) {
        p.removeAttribute("style");
      }
    }
  });
}

function normalizeWordCallouts(doc) {
  // --- Case 1: Word "Save as HTML" classes (ex: NoteBlock / WarnBlock / ExampleBlock)
  const classMap = {
    NoteBlock: "note",
    WarnBlock: "warning",
    ExampleBlock: "example",
  };

  Object.entries(classMap).forEach(([cls, kind]) => {
    doc.querySelectorAll(`p.${cls}`).forEach((p) => {
      const callout = doc.createElement("div");
      callout.className = `callout ${kind}`;

      // Keep the paragraph content, but strip the Word class/style
      p.classList.remove(cls);
      p.removeAttribute("style");

      // Move the paragraph into the callout container
      p.parentNode?.insertBefore(callout, p);
      callout.appendChild(p);
    });
  });

  // --- Case 2: "Copy/paste into ServiceNow" inline-style callouts (border-left + background)
  // Example you showed:
  // Note:    border-left: 4px solid #0073E6; background-color: #F9F9F9;
  // Warning: border-left: 4px solid #FF9800; background-color: #FFF3CD;
  // Example: border-left: 4px solid #AAAAAA; background-color: #F0F0F0;
  doc.querySelectorAll("div[style]").forEach((div) => {
    const style = (div.getAttribute("style") || "").toLowerCase();

    // Quick “is this even a callout-like box?”
    if (!style.includes("border-left") || !style.includes("background")) return;

    let kind = null;
    if (style.includes("#0073e6")) kind = "note";
    else if (style.includes("#ff9800")) kind = "warning";
    else if (style.includes("#aaaaaa")) kind = "example";

    if (!kind) return;

    const callout = doc.createElement("div");
    callout.className = `callout ${kind}`;

    // Replace the styled DIV with our clean callout DIV
    div.parentNode?.insertBefore(callout, div);

    // Keep the content. If it’s already wrapped in <p>, great.
    // If it’s “loose” text/spans, wrap it in a <p> so it matches your export contract style.
    const hasP = Array.from(div.childNodes).some(
      (n) => n.nodeType === 1 && n.tagName.toLowerCase() === "p"
    );

    if (hasP) {
      while (div.firstChild) callout.appendChild(div.firstChild);
    } else {
      const p = doc.createElement("p");
      while (div.firstChild) p.appendChild(div.firstChild);
      callout.appendChild(p);
    }

    div.remove();
  });
}

function normalizeWordOnlinePasteCallouts(doc) {
  const mapKind = (raw) => {
    const v = (raw || "").toLowerCase().trim();
    if (v === "note block" || v === "noteblock") return "note";
    if (v === "warn block" || v === "warning block" || v === "warnblock") return "warning";
    if (v === "example block" || v === "exampleblock") return "example";
    return null;
  };

  const processed = new Set();

  doc.querySelectorAll("[data-ccp-parastyle]").forEach((el) => {
    const kind = mapKind(el.getAttribute("data-ccp-parastyle"));
    if (!kind) return;

    const p = el.closest("p");
    const target = p || el.closest("div") || null;
    if (!target) return;

    // don’t double wrap
    if (target.closest("div.callout")) return;
    if (processed.has(target)) return;
    processed.add(target);

    const callout = doc.createElement("div");
    callout.className = `callout ${kind}`;

    target.parentNode?.insertBefore(callout, target);
    callout.appendChild(target);
  });
}

function serialize(doc) {
  return doc.body.innerHTML.trim();
}

// ===== Public API =====
// Order matters – this is your tuned pipeline from the prototype.
export function cleanHTML(inputHTML) {
  const normalizedInput = normalizeWordEscapes(inputHTML || "");
  const doc = parseHTML(normalizedInput);

  // 1) Strip obviously unsafe/noisy stuff
  removeHtmlComments(doc);
  removeOfficeNamespaces(doc);
  removeDangerousNodes(doc);

  normalizeWordParaBorderDivs(doc);

  // 2) Word Online / structural cleanup
  flattenWordOnlineWrappers(doc);
  unwrapSingleRootDiv(doc);
  normalizeWordOnlineHeadings(doc);   // <p role="heading"> → <h1>…<h6>

  normalizeWordOnlineLists(doc);      // 👈 NEW: use data-listid + level info

  // 3) Headings and lists (classic Word HTML)
  convertMsoHeadings(doc);            // legacy MsoHeading1 → <h1>
  convertListsInDoc(doc);             // Word-style <p> bullets → <ul>/<ol><li>
  mergeAdjacentLists(doc);
  normalizeListStarts(doc);           // drop start="1" etc.

  // 4) Word comments and inline styles
  removeWordComments(doc);
    normalizeWordSemanticSpans(doc);
  applyInlineStyleFormatting(doc);    // span[style] → <strong>/<em>/<u>/<s>/<sup>/<sub>
  removeMsoStyling(doc);              // strip mso-* rules/classes
  normalizeWordOnlinePasteCallouts(doc);
  normalizeLinks(doc);
  ensureInDocAnchorTargets(doc);
  normalizeBookmarkAnchors(doc);
  normalizeWordCallouts(doc);
  flattenMhtWrapperDivs(doc);

  // 5) Generic normalization / attribute slimming
  stripNonContentAttributes(doc);     // keep href/src/alt/colspan/... only
  dedupeIds(doc);
  unwrapEmptySpans(doc);              // span with no attributes → unwrap
  removeEmptyParagraphs(doc);         // nukes &nbsp;/whitespace-only <p>s

  normalizeInlineFormatting(doc);     // legacy <b>/<i> → <strong>/<em>
  normalizeInlineSpacing(doc);        // fix spaces around inline tags
  normalizeTables(doc);              // unwrap tbody/thead/tfoot; drop colgroup/col
  stripTableBorders(doc);
  unwrapParasInListItems(doc);        // <li><p>foo</p></li> → <li>foo</li>

  return serialize(doc);
}



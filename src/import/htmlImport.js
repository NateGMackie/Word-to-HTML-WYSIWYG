// src/services/convert.js
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

function normalizeLinks(doc) {
  const allowedSchemes = new Set(["http:", "https:", "mailto:"]);
  const anchors = doc.querySelectorAll("a[href]");

  anchors.forEach((a) => {
    const hrefRaw = (a.getAttribute("href") || "").trim();

    // Empty href => unwrap
    if (!hrefRaw) {
      a.replaceWith(...a.childNodes);
      return;
    }

    const schemeMatch = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.exec(hrefRaw);
if (schemeMatch) {
  const scheme = schemeMatch[0].toLowerCase(); // e.g. "javascript:"
  if (!allowedSchemes.has(scheme)) {
    a.replaceWith(...a.childNodes);
    return;
  }
}

    // Anchor link
    if (hrefRaw.startsWith("#")) {
      // Keep only href (strip target/rel/etc.)
      Array.from(a.attributes).forEach((attr) => {
        if (attr.name !== "href") a.removeAttribute(attr.name);
      });
      return;
    }

    // Parse scheme safely
    let url;
    try {
      url = new URL(hrefRaw, "https://example.invalid"); // base for relative
    } catch {
      // If it's not parseable, unwrap
      a.replaceWith(...a.childNodes);
      return;
    }

    const scheme = url.protocol;

    // Disallowed scheme => unwrap
    if (!allowedSchemes.has(scheme)) {
      a.replaceWith(...a.childNodes);
      return;
    }

    // External http(s): enforce rel/target (matches export contract)
    if (scheme === "http:" || scheme === "https:") {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } else {
      // mailto: should not get target/rel by default
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

  const isAllowedCalloutClass = (el) => {
    if (el.tagName.toLowerCase() !== "div") return false;
    const cls = (el.getAttribute("class") || "").trim().toLowerCase();
    if (!cls) return false;

    const parts = cls.split(/\s+/).filter(Boolean);
    if (!parts.includes("callout")) return false;

    // must contain exactly one known kind
    const kind = parts.find((p) => p !== "callout");
    return !!kind && allowedCalloutKinds.has(kind);
  };

  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();

      // If not in base keep list, drop it.
      if (!keep.has(name)) {
        el.removeAttribute(attr.name);
        return;
      }

      // Special rule: keep class ONLY when it’s a recognized callout.
      if (name === "class" && !isAllowedCalloutClass(el)) {
        el.removeAttribute("class");
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
  doc.querySelectorAll('span[style]').forEach(span => {
    let style = (span.getAttribute('style') || '').toLowerCase();
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
      // move contents into wrapper
      while (node.firstChild) {
        wrapper.appendChild(node.firstChild);
      }
      // replace current node with wrapper
      node.parentNode.insertBefore(wrapper, node);
      node.remove();
      node = wrapper;
    };

    // Order doesn’t hugely matter, but this reads well
    if (isBold)       wrap('strong');
    if (isItalic)     wrap('em');
    if (hasUnderline) wrap('u');
    if (hasStrike)    wrap('s');
    if (isSup)        wrap('sup');
    if (isSub)        wrap('sub');
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

// ---- List conversion helpers (handles real Word levels + style-change heuristics) ----
function getListInfo(p) {
  const cls = p.className || "";
  const style = (p.getAttribute("style") || "").toLowerCase();
  const text = (p.textContent || "").trim();

  // Word flags
  const hasWordFlag = /mso-list/.test(style) || /MsoListParagraph/i.test(cls);

  // Parse explicit Word list id + level:  mso-list:l0 level2 lfo1
  let listId = null;
  let level = null;
  const mWord = /mso-list:\s*l(\d+)\s+level(\d+)/i.exec(style);
  if (mWord) {
    listId = Number(mWord[1]);
    level = Math.max(1, parseInt(mWord[2], 10));
  }
  const firstChar = (text || "").replace(/^\s+/, "")[0];
const wordBulletGlyphs = new Set(["o", "§", "·"]);
if (hasWordFlag && wordBulletGlyphs.has(firstChar)) {
  return { type: "ul", level, styleType: null, listId };
}

  // Fallback: "levelN" elsewhere
  if (level == null) {
    const mLevel = /level\s*([0-9]+)/i.exec(style);
    if (mLevel) level = Math.max(1, parseInt(mLevel[1], 10));
  }

  // As a last resort, infer from margin-left
  if (level == null) {
    const mMargin = /margin-left:\s*([0-9.]+)\s*([a-z%]+)/.exec(style);
    if (mMargin) {
      let px = parseFloat(mMargin[1]);
      const unit = mMargin[2];
      if (unit === "in") px *= 96;
      else if (unit === "pt") px *= 1.333;
      else if (unit === "cm") px *= 37.8;
      else if (unit === "mm") px *= 3.78;
      else if (unit === "em") px *= 16;
      else if (unit === "%") px = 0;
      level = Math.max(1, Math.min(8, Math.round(px / 18) + 1));
    }
  }
  if (level == null) level = 1;

  // Determine list type from visible marker
  const bulletRe = /^[\u2022\u00B7\u2219\u25AA\u25CF\-*]/;
  const orderedRe = /^(?:\d+|[A-Za-z]+|[ivxlcdm]+)[.)]/i;
  if (!(hasWordFlag || bulletRe.test(text) || orderedRe.test(text))) return null;

  const type = bulletRe.test(text) ? "ul" : "ol";

  // Optional: cosmetics + heuristics
  let styleType = null;
  if (type === "ol") {
    if (/^[a-z][.)]/.test(text)) styleType = "lower-alpha";
    else if (/^[A-Z][.)]/.test(text)) styleType = "upper-alpha";
    else if (/^(?:[ivxlcdm]+)[.)]/i.test(text)) styleType = "lower-roman";
  }

  return { type, level, styleType, listId };
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
    /^(?:[\u2022\u00B7\u2219\u25AA\u25CF\-*]|(?:\(?(?:\d+|[A-Za-z]+|[ivxlcdm]+)[.)]))\s*/i;

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

    // Collect this list and any immediately following sibling lists
    // that share the same tag and listId (Word Online = same logical list).
    const lists = [node];
    let cursor = node.nextElementSibling;
    while (cursor && cursor.tagName === tag) {
      const li = cursor.querySelector("li");
      const cursorListId = li && li.getAttribute("data-listid");
      if (cursorListId !== listId) break;
      lists.push(cursor);
      cursor = cursor.nextElementSibling;
    }

    // If there's only one list, we still might want to normalize nesting,
    // but for now we only bother when there are multiple segments.
    if (lists.length > 1) {
      const combined = doc.createElement(tag);

      // Stack of lists by level; index = level - 1
      const listStack = [combined];

      const ensureLevel = (level) => {
        if (level < 1) level = 1;

        // Grow: create nested lists as needed
        while (listStack.length < level) {
          const parentList = listStack[listStack.length - 1];
          const parentLi = parentList.lastElementChild;
          if (!parentLi) break; // can't nest yet if there's no parent <li>

          const newList = doc.createElement(tag);
          parentLi.appendChild(newList);
          listStack.push(newList);
        }

        // Shrink: pop back to the requested level
        while (listStack.length > level) {
          listStack.pop();
        }
      };

      // Walk all lis in DOM order across the sequence
      lists.forEach((ol) => {
        Array.from(ol.children).forEach((li) => {
          if (li.tagName !== "LI") return;

          const levelAttr =
            li.getAttribute("data-aria-level") ||
            li.getAttribute("aria-level");

          let level = parseInt(levelAttr || "1", 10);
          if (!Number.isFinite(level) || level < 1) level = 1;

          ensureLevel(level);

          const currentList = listStack[level - 1];
          currentList.appendChild(li); // Move <li> into the combined structure
        });
      });

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

  const olStyle = (el) =>
    (el && el.style && el.style.listStyleType) || "decimal";
  const styleRank = (type, styleType) => {
    if (type !== "ol") return 0;
    const st = (styleType || "decimal").toLowerCase();
    if (st.includes("roman")) return 2;
    if (st.includes("alpha")) return 1;
    return 0; // decimal/default
  };

  function pushList(info, parentLi) {
    const list = doc.createElement(info.type);
    if (info.styleType) list.style.listStyleType = info.styleType;

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
    if (
      !(
        node &&
        node.nodeType === Node.ELEMENT_NODE &&
        node.tagName === "P"
      )
    )
      return false;
    const txt = (node.textContent || "").replace(/\u00A0/g, " ").trim();
    return txt === "";
  }

  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];

    if (n.nodeType === Node.ELEMENT_NODE && n.tagName === "P") {
      let info = getListInfo(n);
      if (info) {
        // If a list is open, decide nest/pop based on style rank (decimal < alpha < roman)
        if (stack.length) {
          const cur = current();
          if (
            info.type === "ol" &&
            cur.type === "ol" &&
            info.level <= cur.level
          ) {
            const curRank = styleRank(cur.type, cur.styleType);
            const newRank = styleRank(info.type, info.styleType);
            if (newRank > curRank) {
              // decimal -> alpha/roman: go one level deeper
              info.level = cur.level + 1;
            } else if (newRank < curRank) {
              // alpha/roman -> decimal: pop one level
              info.level = Math.max(1, cur.level - 1);
            }
          }
          // clamp jumps to at most one deeper
          if (info.level > current().level + 1) info.level = current().level + 1;
        } else if (lastLiGlobal) {
          // Stack is empty but previous output was an <li>.
          const parentList = lastLiGlobal.parentElement;
          const parentIsOl =
            parentList && parentList.tagName === "OL";
          const parentRank = parentIsOl
            ? styleRank("ol", olStyle(parentList))
            : 0;
          const newRank =
            info.type === "ol" ? styleRank("ol", info.styleType) : 0;
          const prevIntro = /[:：]\s*$/.test(
            (lastLiGlobal.textContent || "")
          );

          // Only carry-over nest if rank increases (or previous li ended with ":")
          if (newRank > parentRank || prevIntro) {
            info.level = (lastLiGlobal._level || 1) + 1;
            pushList(info, lastLiGlobal);
          }
        }
        
// Before opening/continuing lists for this item:
if (stack.length && info.level < current().level) {
  closeTo(info.level);
}

if (stack.length) {
  // If level decreased, pop back
  if (info.level < current().level) closeTo(info.level);

  // If same level but list type changed (ul <-> ol), pop to parent so we can start a sibling list cleanly
  if (info.level === current().level && info.type !== current().type) closeTo(info.level - 1);
}


        // Open/continue the appropriate list at the target level
        if (
          !stack.length ||
          current().level < info.level ||
          current().type !== info.type
        ) {
          pushList(info);
        } else if (
          current().type === "ol" &&
          (info.styleType || "decimal") !==
            (current().styleType || "decimal")
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
      } else if (stack.length && isTrivialParagraph(n)) {
        // ignore blank spacer paragraphs inside lists
        i++;
        continue;
      }
    }

    // For any other node: if it's whitespace-only text we already skipped it above.
    // Close lists only on meaningful non-list content.
    closeTo(0);
    frag.appendChild(n.cloneNode(true));
    i++;
  }

  closeTo(0);
  root.innerHTML = "";
  root.appendChild(frag);
}

function mergeAdjacentLists(doc) {
  const root = doc.body;
  let n = root.firstElementChild;
  while (n) {
    if (n.tagName === "OL" || n.tagName === "UL") {
      let next = n.nextElementSibling;
      while (
        next &&
        next.tagName === n.tagName &&
        (next.getAttribute("style") || "") ===
          (n.getAttribute("style") || "")
      ) {
        while (next.firstElementChild) n.appendChild(next.firstElementChild);
        const drop = next;
        next = next.nextElementSibling;
        drop.remove();
      }
    }
    n = n.nextElementSibling;
  }
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
  const doc = parseHTML(inputHTML || "");



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
  applyInlineStyleFormatting(doc);    // span[style] → <strong>/<em>/<u>/<s>/<sup>/<sub>
  removeMsoStyling(doc);              // strip mso-* rules/classes
  normalizeWordOnlinePasteCallouts(doc);
  normalizeLinks(doc);
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



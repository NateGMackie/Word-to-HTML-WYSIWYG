// src/import/sanitizeToContract.js

const ALLOWED_TAGS = new Set([
  // blocks
  'h1','h2','h3','p','ul','ol','li','blockquote','pre','div','table','tr','th','td','hr','img',
  // inline
  'span','strong','em','u','s','sub','sup','a','br',
]);

const VOID_TAGS = new Set(['br','hr','img']);

function isDataAttr(name) {
  return name.toLowerCase().startsWith('data-');
}

function normalizeClassTokens(value) {
  return (value || '')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);
}

function setOrRemoveAttr(el, name, value) {
  if (value == null || value === '') el.removeAttribute(name);
  else el.setAttribute(name, value);
}

// Contract rules distilled from export_contract.md
// - no style, no data-*
// - tag-specific allowed attrs
// - allowed class tokens for div/span/img
export function sanitizeToContract(inputHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(inputHtml || '', 'text/html');

  const warnings = [];

  // Walk elements in a stable way (TreeWalker)
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const toProcess = [];
  while (walker.nextNode()) toProcess.push(walker.currentNode);

  for (const el of toProcess) {
    const tag = el.tagName.toLowerCase();

    // Drop unknown tags by unwrapping (preserve children/text)
    if (!ALLOWED_TAGS.has(tag)) {
      warnings.push(`Removed unsupported <${tag}> (unwrapped).`);
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      continue;
    }

    // Strip forbidden attributes broadly
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      if (name.toLowerCase() === 'style' || isDataAttr(name)) {
        el.removeAttribute(name);
        warnings.push(`Removed forbidden attribute ${name} from <${tag}>.`);
      }
    }

    // Tag-specific attribute allowlists
    const attrs = Array.from(el.attributes).map(a => a.name);

    function dropAllExcept(keep) {
      for (const name of attrs) {
        if (!keep.has(name.toLowerCase())) el.removeAttribute(name);
      }
    }

    if (tag === 'a') {
      dropAllExcept(new Set(['href','target','rel']));
      // href required; if missing, unwrap link but keep children text
      if (!el.getAttribute('href')) {
        warnings.push(`Link missing href; unwrapped <a>.`);
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
      }
    } else if (tag === 'pre') {
      dropAllExcept(new Set(['spellcheck']));
      const sc = el.getAttribute('spellcheck');
      if (sc && sc !== 'false') setOrRemoveAttr(el, 'spellcheck', 'false');
    } else if (tag === 'div') {
      dropAllExcept(new Set(['class']));
      // Only callout divs may keep class, otherwise class stripped.
      const tokens = normalizeClassTokens(el.getAttribute('class'));
      const isCallout = tokens.includes('callout');
      if (!isCallout) {
        el.removeAttribute('class');
      } else {
        // must be exactly: callout + one kind (note|example|warning)
        const kinds = tokens.filter(t => t !== 'callout');
        const allowedKinds = new Set(['note','example','warning']);
        const keptKind = kinds.find(k => allowedKinds.has(k));
        if (!keptKind || kinds.filter(k => allowedKinds.has(k)).length !== 1) {
          warnings.push(`Invalid callout class on <div>; unwrapped callout.`);
          // unwrap the div entirely (don’t keep a fake callout container)
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
          }
        } else {
          el.setAttribute('class', `callout ${keptKind}`);
        }
      }
    } else if (tag === 'span') {
      dropAllExcept(new Set(['class']));
      const tokens = normalizeClassTokens(el.getAttribute('class'));
      const allowed = new Set(['user-input','variable']);
      const kept = tokens.find(t => allowed.has(t));
      if (!kept) el.removeAttribute('class');
      else el.setAttribute('class', kept);
    } else if (tag === 'img') {
      dropAllExcept(new Set(['src','class','alt','height','width']));
      if (!el.getAttribute('src')) {
        warnings.push(`Image missing src; removed <img>.`);
        el.remove();
        continue;
      }
      const tokens = normalizeClassTokens(el.getAttribute('class'));
      const allowed = new Set(['screenshot','icon']);
      const kept = tokens.filter(t => allowed.has(t));
      setOrRemoveAttr(el, 'class', kept.length ? kept.join(' ') : '');
    } else if (tag === 'th' || tag === 'td') {
      dropAllExcept(new Set(['colspan','rowspan']));
    } else if (tag === 'table' || tag === 'tr') {
      dropAllExcept(new Set([]));
    } else {
      // default: no attrs allowed
      dropAllExcept(new Set([]));
    }

    // Void tag normalization: ensure no children
    if (VOID_TAGS.has(tag)) {
      while (el.firstChild) el.removeChild(el.firstChild);
    }
  }

  return {
    html: doc.body.innerHTML.trim(),
    warnings,
  };
}

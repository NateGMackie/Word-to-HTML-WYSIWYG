import { parseHTML } from './convert.js';


export function htmlToMarkdown(html){
const doc = parseHTML(html);
const out = [];
const blockSep = () => { if (out.length && out[out.length-1] !== '') out.push(''); };
const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/([*_`[\]])/g, '\\$1');
const collapseWs = (s) => s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ');
const getText = (node) => { if (!node) return ''; if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || ''; let s = ''; node.childNodes.forEach(ch => s += getText(ch)); return s; };
function renderInline(node){
if (!node) return ''; if (node.nodeType === Node.TEXT_NODE) return esc(node.nodeValue || ''); if (node.nodeType !== Node.ELEMENT_NODE) return '';
const t = node.tagName;
if (t === 'BR') return ' \n';
if (t === 'STRONG' || t === 'B') return '**' + renderChildren(node) + '**';
if (t === 'EM' || t === 'I') return '*' + renderChildren(node) + '*';
if (t === 'CODE' && node.parentElement && node.parentElement.tagName !== 'PRE') return '`' + (getText(node).replace(/`/g,'\\`')) + '`';
if (t === 'A'){ const href = node.getAttribute('href') || ''; const text = renderChildren(node).replace(/\n+/g,' '); return `[${text}](${href})`; }
if (t === 'IMG'){ const alt = node.getAttribute('alt') || ''; const src = node.getAttribute('src') || ''; return `![${esc(alt)}](${src})`; }
return renderChildren(node);
}
function renderChildren(node){ let s=''; node.childNodes.forEach(ch=>{ s += renderInline(ch); }); return s; }
function renderBlock(node, ctx){
if (!node) return; if (node.nodeType !== Node.ELEMENT_NODE){ const txt = (node.nodeType === Node.TEXT_NODE ? node.nodeValue : '') || ''; if (txt.trim()) { blockSep(); out.push(esc(txt.trim())); blockSep(); } return; }
const t = node.tagName;
if (/^H[1-6]$/.test(t)){ const lvl = Number(t.slice(1)); blockSep(); out.push('#'.repeat(lvl) + ' ' + collapseWs(renderChildren(node)).trim()); blockSep(); return; }
if (t === 'PRE'){ const code = node.textContent.replace(/\r\n/g,'\n').replace(/\t/g,' '); blockSep(); out.push('```'); out.push(code.trimEnd()); out.push('```'); blockSep(); return; }
if (t === 'P' || t === 'DIV'){ const content = collapseWs(renderChildren(node)).trim(); if (content){ blockSep(); out.push(content); blockSep(); } return; }
if (t === 'HR'){ blockSep(); out.push('---'); blockSep(); return; }
if (t === 'UL' || t === 'OL'){ blockSep(); renderList(node, { depth: (ctx?.depth||0) }); blockSep(); return; }
if (t === 'TABLE'){
const rows = Array.from(node.querySelectorAll('tr')).map(tr => Array.from(tr.children).map(td => collapseWs(getText(td)).trim()));
if (!rows.length) return; const hasTh = !!node.querySelector('th'); const head = hasTh ? rows[0] : rows[0].map((_,i)=>`Col ${i+1}`); const body = hasTh ? rows.slice(1) : rows;
blockSep(); out.push('| ' + head.join(' | ') + ' |'); out.push('| ' + head.map(h => '-'.repeat(Math.max(3, h.length))).join(' | ') + ' |'); body.forEach(r => out.push('| ' + r.join(' | ') + ' |')); blockSep(); return;
}
node.childNodes.forEach(ch => renderBlock(ch, ctx));
}
function renderList(listEl, ctx){
const isOl = listEl.tagName === 'OL';
const startAttr = parseInt(listEl.getAttribute('start') || '1', 10);
let n = isOl && !Number.isNaN(startAttr) ? startAttr : 1;
const items = Array.from(listEl.children).filter(ch => ch.tagName === 'LI');
items.forEach(li=>{
const indent = ' '.repeat(ctx.depth || 0);
const marker = isOl ? (n++) + '. ' : '- ';
const nestedLists = [];
const lead = document.createElement('span');
Array.from(li.childNodes).forEach(ch=>{ if (ch.nodeType === 1 && (ch.tagName === 'UL' || ch.tagName === 'OL')) nestedLists.push(ch); else lead.appendChild(ch.cloneNode(true)); });
const leadText = lead.textContent.replace(/\s+/g,' ').trim();
const leadLines = leadText.split('\n');
out.push(indent + marker + (leadLines.shift() || '').trim());
const contIndent = indent + (isOl ? ' ' : ' ');
leadLines.forEach(line=>{ if (line.trim()) out.push(contIndent + line.trim()); });
nestedLists.forEach(sub=>{ renderList(sub, { depth: (ctx.depth || 0) + 1 }); });
});
}
Array.from(doc.body.childNodes).forEach(node => renderBlock(node, {depth:0}));
return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
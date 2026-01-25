import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { cleanHTML } from "../src/services/convert.js";
// Optional smoke:
import { cleanAndNormalizeExportHtml } from "../src/export/htmlExport.js";

function installDomShim() {
  const dom = new JSDOM(`<!doctype html><html><body></body></html>`);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.NodeFilter = dom.window.NodeFilter;
}
installDomShim();

// Reuse your prettyHtml(), BUT remove the tbody stripping section
function prettyHtml(html) {
  // ... your existing implementation ...
}

const FIXTURES_DIR = path.resolve("tests/sanitize/fixtures_word");
const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".input.html"));

let failures = 0;

for (const inputFile of files) {
  const base = inputFile.replace(/\.input\.html$/, "");
  const expectedFile = `${base}.expected.html`;

  const inputPath = path.join(FIXTURES_DIR, inputFile);
  const expectedPath = path.join(FIXTURES_DIR, expectedFile);

  const input = fs.readFileSync(inputPath, "utf8");
  const expected = fs.readFileSync(expectedPath, "utf8").trim();

  const cleaned = cleanHTML(input);
  const actual = prettyHtml(cleaned).trim();

  if (actual !== expected) {
    failures++;
    console.error(`\n❌ Fixture failed: ${base}`);
    console.error(`--- expected ---\n${expected}`);
    console.error(`--- actual ---\n${actual}`);
  } else {
    console.log(`✅ ${base}`);
  }

  // Optional pipeline smoke
  // const exported = cleanAndNormalizeExportHtml(cleaned);
  // console.log(prettyHtml(exported));
}

if (failures) {
  console.error(`\n${failures} fixture(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll Word fixtures passed.");
}

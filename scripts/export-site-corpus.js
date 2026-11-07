#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const files = [
  "poems.js",
  "poems-extra.js",
  "poems-user-collection.js",
  "poems-hasan-collection.js",
  "telegram-poems.js",
  "internet-poems.js",
  "poems-batch-001.js",
  "poems-batch-002.js",
  "poems-batch-003.js",
  "pinned.js"
];

const window = {
  poemEntries: [],
  pinnedEntries: [],
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {}
};
const sandbox = { window, console: { log(){}, warn(){}, error(){} } };
vm.createContext(sandbox);

for (const file of files) {
  const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  vm.runInContext(source, sandbox, { filename: file, timeout: 15000 });
}

const out = process.argv[2] || "site-corpus-index.jsonl";
const rows = [
  ...window.poemEntries.map((x, i) => ({...x, _siteCollection:"main", _siteOrder:i})),
  ...window.pinnedEntries.map((x, i) => ({...x, _siteCollection:"pinned", _siteOrder:i}))
];
const stream = fs.createWriteStream(out, {encoding:"utf8"});
for (const row of rows) stream.write(JSON.stringify(row) + "\n");
stream.end();
stream.on("finish", () => {
  process.stdout.write(JSON.stringify({
    mainEntries: window.poemEntries.length,
    pinnedEntries: window.pinnedEntries.length,
    total: rows.length,
    filesLoaded: files
  }) + "\n");
});

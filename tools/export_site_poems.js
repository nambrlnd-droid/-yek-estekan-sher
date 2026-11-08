#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const sources = [
  "poems.js",
  "poems-extra.js",
  "poems-user-collection.js",
  "poems-hasan-collection.js",
  "telegram-poems.js",
  "internet-poems.js",
  "pinned.js"
];
for (const relative of sources) {
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, "utf8");
  vm.runInContext(source, sandbox, { filename: relative, timeout: 30000 });
}
const payload = {
  poems: Array.isArray(sandbox.window.poemEntries) ? sandbox.window.poemEntries : [],
  pinned: Array.isArray(sandbox.window.pinnedEntries) ? sandbox.window.pinnedEntries : [],
  sourceFiles: sources
};
const output = path.join(root, ".cache", "site-poems.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(payload), "utf8");
process.stdout.write(JSON.stringify({
  output: path.relative(root, output),
  poems: payload.poems.length,
  pinned: payload.pinned.length,
  sourceFiles: sources.length
}) + "\n");

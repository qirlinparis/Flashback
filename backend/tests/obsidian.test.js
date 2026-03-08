/**
 * obsidian.test.js – Unit tests for the Obsidian integration adapter
 * Uses Node.js built-in test runner (node --test)
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const os = require("os");
const fs = require("fs");

const { parseFrontMatter, fileToEntry, listMarkdownFiles } = require("../src/integrations/obsidian");

// ─── parseFrontMatter ─────────────────────────────────────────────────────────

describe("parseFrontMatter", () => {
  it("parses a valid front matter block", () => {
    const md = `---\ntitle: My Note\ntags: [a, b]\n---\nHello world`;
    const { data, body } = parseFrontMatter(md);
    assert.equal(data.title, "My Note");
    assert.equal(body.trim(), "Hello world");
  });

  it("returns empty data and full content when there is no front matter", () => {
    const md = "Just plain text";
    const { data, body } = parseFrontMatter(md);
    assert.deepEqual(data, {});
    assert.equal(body, "Just plain text");
  });
});

// ─── fileToEntry ──────────────────────────────────────────────────────────────

describe("fileToEntry", () => {
  it("converts a Markdown file to a Flashback entry", () => {
    const tmpFile = path.join(os.tmpdir(), `flashback_test_${Date.now()}.md`);
    fs.writeFileSync(tmpFile, `---\ntitle: Test Note\ntags: [memory, test]\n---\nSome content here`);

    const entry = fileToEntry(tmpFile);
    assert.equal(entry.source, "obsidian");
    assert.equal(entry.title, "Test Note");
    assert.equal(entry.content, "Some content here");
    assert.deepEqual(entry.tags, ["memory", "test"]);
    assert.ok(entry.id.startsWith("obsidian_"));

    fs.unlinkSync(tmpFile);
  });

  it("uses filename as title when no front matter title is set", () => {
    const tmpFile = path.join(os.tmpdir(), `my-journal-entry_${Date.now()}.md`);
    fs.writeFileSync(tmpFile, "No front matter here");

    const entry = fileToEntry(tmpFile);
    assert.ok(entry.title.startsWith("my-journal-entry"));
    fs.unlinkSync(tmpFile);
  });
});

// ─── listMarkdownFiles ────────────────────────────────────────────────────────

describe("listMarkdownFiles", () => {
  it("recursively finds .md files in a directory", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flashback_vault_"));
    const subDir = path.join(tmpDir, "sub");
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(tmpDir, "note1.md"), "");
    fs.writeFileSync(path.join(subDir, "note2.md"), "");
    fs.writeFileSync(path.join(tmpDir, "not-a-note.txt"), "");

    const files = listMarkdownFiles(tmpDir);
    assert.equal(files.length, 2);
    assert.ok(files.every((f) => f.endsWith(".md")));

    fs.rmSync(tmpDir, { recursive: true });
  });
});

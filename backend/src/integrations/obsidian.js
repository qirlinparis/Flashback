/**
 * obsidian.js – Obsidian vault integration adapter
 *
 * Reads Markdown files from an Obsidian vault directory and converts them
 * into Flashback entries. Works by scanning the local file system.
 *
 * Required env vars:
 *   OBSIDIAN_VAULT_PATH – absolute path to the Obsidian vault directory
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Parse YAML front matter from a Markdown string.
 * Returns { data, body } where data is a key→value map (strings only).
 *
 * @param {string} content
 * @returns {{ data: object, body: string }}
 */
function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) {
      data[key.trim()] = rest.join(":").trim().replace(/^["']|["']$/g, "");
    }
  }
  return { data, body: match[2] };
}

/**
 * Recursively list all .md files in a directory.
 * @param {string} dir
 * @returns {string[]} absolute file paths
 */
function listMarkdownFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      results.push(...listMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Convert a Markdown file into a Flashback entry.
 * @param {string} filePath
 * @returns {FlashbackEntry}
 */
function fileToEntry(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, body } = parseFrontMatter(raw);
  const stat = fs.statSync(filePath);

  const id = `obsidian_${crypto.createHash("sha1").update(filePath).digest("hex")}`;
  const title = data.title || path.basename(filePath, ".md");

  let tags = [];
  if (data.tags) {
    // Support YAML inline arrays ("tags: [a, b]") and plain comma lists ("tags: a, b").
    // Strip surrounding brackets if present, then split on commas.
    const raw = data.tags.trim().replace(/^\[|\]$/g, "");
    tags = raw
      .split(",")
      .map((t) => t.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  return {
    id,
    source: "obsidian",
    title,
    content: body.trim(),
    tags,
    created_at: data.created || stat.birthtime.toISOString(),
    updated_at: data.updated || stat.mtime.toISOString(),
  };
}

/**
 * Scan the Obsidian vault and return all entries.
 * @returns {FlashbackEntry[]}
 */
function fetchEntries() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) {
    throw new Error("OBSIDIAN_VAULT_PATH environment variable is required for Obsidian integration");
  }
  if (!fs.existsSync(vaultPath)) {
    throw new Error(`Vault path does not exist: ${vaultPath}`);
  }

  return listMarkdownFiles(vaultPath).map(fileToEntry);
}

module.exports = { fetchEntries, fileToEntry, parseFrontMatter, listMarkdownFiles };

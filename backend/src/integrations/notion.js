/**
 * notion.js – Notion integration adapter
 *
 * Fetches pages from a Notion database and converts them into Flashback entries.
 * Required env vars:
 *   NOTION_TOKEN       – Notion integration secret
 *   NOTION_DATABASE_ID – ID of the database to sync
 */

const { Client } = require("@notionhq/client");
const crypto = require("crypto");

function createClient() {
  if (!process.env.NOTION_TOKEN) {
    throw new Error("NOTION_TOKEN environment variable is required for Notion integration");
  }
  return new Client({ auth: process.env.NOTION_TOKEN });
}

/**
 * Convert a Notion page object into a Flashback entry.
 * @param {object} page – raw Notion page from the API
 * @returns {FlashbackEntry}
 */
function pageToEntry(page) {
  const props = page.properties || {};

  // Try common title property names
  const titleProp =
    props["Name"] || props["Title"] || props["title"] ||
    Object.values(props).find((p) => p.type === "title");

  const title = titleProp?.title?.map((t) => t.plain_text).join("") || "Untitled";

  // Extract tags/multi_select properties
  const tagProp =
    props["Tags"] || props["tags"] || props["Label"] ||
    Object.values(props).find((p) => p.type === "multi_select");

  const tags = tagProp?.multi_select?.map((s) => s.name) || [];

  return {
    id: `notion_${page.id.replace(/-/g, "")}`,
    source: "notion",
    title,
    content: title, // page body is fetched separately via blocks
    tags,
    created_at: page.created_time,
    updated_at: page.last_edited_time,
  };
}

/**
 * Fetch all pages from a Notion database and return Flashback entry objects.
 * Paginates automatically.
 *
 * @returns {Promise<FlashbackEntry[]>}
 */
async function fetchEntries() {
  const notion = createClient();
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID environment variable is required");
  }

  const entries = [];
  let cursor;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      const entry = pageToEntry(page);

      // Fetch page content (blocks) and append as plain text
      try {
        const blocks = await notion.blocks.children.list({ block_id: page.id });
        const text = blocks.results
          .filter((b) => b[b.type]?.rich_text)
          .map((b) => b[b.type].rich_text.map((t) => t.plain_text).join(""))
          .join("\n");
        if (text) {
          entry.content = text;
        }
      } catch {
        // Non-fatal – use title as content fallback
      }

      entries.push(entry);
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return entries;
}

module.exports = { fetchEntries, pageToEntry };

/**
 * apple-notes.js – Apple Notes integration adapter
 *
 * Exports notes from Apple Notes using an embedded AppleScript. Works on macOS
 * only. The script iterates over every note in every folder and returns JSON.
 *
 * Usage:
 *   node -e "require('./apple-notes').fetchEntries().then(console.log)"
 *
 * No environment variables are required – access is controlled by macOS
 * permission prompts (System Preferences → Privacy → Automation).
 */

const { execSync } = require("child_process");
const crypto = require("crypto");

const APPLESCRIPT = `
set output to "["
set noteList to {}
tell application "Notes"
  set allFolders to every folder
  repeat with aFolder in allFolders
    set allNotes to every note in aFolder
    repeat with aNote in allNotes
      set noteId to id of aNote
      set noteTitle to name of aNote
      set noteBody to plaintext of aNote
      set noteCreated to creation date of aNote as string
      set noteModified to modification date of aNote as String
      -- Escape double quotes in content
      set noteBody to do shell script "echo " & quoted form of noteBody & " | sed 's/\\\"/\\\\\\\"/g'"
      set noteTitle to do shell script "echo " & quoted form of noteTitle & " | sed 's/\\\"/\\\\\\\"/g'"
      set entry to "{\\"id\\":\\"" & noteId & "\\",\\"title\\":\\"" & noteTitle & "\\",\\"content\\":\\"" & noteBody & "\\",\\"created_at\\":\\"" & noteCreated & "\\",\\"updated_at\\":\\"" & noteModified & "\\"}"
      if output is "[" then
        set output to output & entry
      else
        set output to output & "," & entry
      end if
    end repeat
  end repeat
end tell
set output to output & "]"
return output
`;

/**
 * Run AppleScript and return its stdout as a string.
 * @param {string} script
 * @returns {string}
 */
function runAppleScript(script) {
  return execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
    encoding: "utf8",
    timeout: 30000,
  });
}

/**
 * Fetch all Apple Notes and return Flashback entry objects.
 * @returns {FlashbackEntry[]}
 */
function fetchEntries() {
  if (process.platform !== "darwin") {
    throw new Error("Apple Notes integration is only available on macOS");
  }

  let raw;
  try {
    raw = runAppleScript(APPLESCRIPT);
  } catch (err) {
    throw new Error(`Failed to read Apple Notes via AppleScript: ${err.message}`);
  }

  let notes;
  try {
    notes = JSON.parse(raw.trim());
  } catch {
    throw new Error("Could not parse Apple Notes output as JSON. Ensure Notes app is accessible.");
  }

  return notes.map((note) => ({
    id: `apple_notes_${crypto.createHash("sha1").update(note.id).digest("hex")}`,
    source: "apple_notes",
    title: note.title || "Untitled",
    content: note.content || note.title || "",
    tags: [],
    created_at: new Date(note.created_at).toISOString(),
    updated_at: new Date(note.updated_at).toISOString(),
  }));
}

module.exports = { fetchEntries };

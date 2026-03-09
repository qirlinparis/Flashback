// Flashback — Scriptable Widget
// Shows today's fragment on your home screen.
// Dark, minimal. Your words, not AI paraphrase.
//
// Setup:
// 1. Install Scriptable from the App Store
// 2. Copy this file to iCloud Drive/Scriptable/
// 3. Set API_URL below (production domain once deployed, local IP for dev)
// 4. Add a Scriptable widget to your home screen
// 5. Long-press the widget → Edit Widget → choose "flashback"

// --- CONFIG ---
const API_URL = "https://qirlinparis.code"   // production
// const API_URL = "http://192.168.1.183:8000" // local dev
const USER_ID = 1
// --------------

async function getFragment() {
  const url = `${API_URL}/surface/${USER_ID}?limit=1`
  const req = new Request(url)
  req.timeoutInterval = 10

  try {
    const data = await req.loadJSON()
    if (data.fragments && data.fragments.length > 0) {
      return data.fragments[0]
    }
    return null
  } catch (e) {
    return null
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return ""
  const then = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24))

  if (days < 1) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months} ${months === 1 ? "month" : "months"} ago`
  }
  const years = Math.floor(days / 365)
  return `${years} ${years === 1 ? "year" : "years"} ago`
}

function truncate(text, maxLen) {
  if (!text) return ""
  if (text.length <= maxLen) return text
  // cut at last space before maxLen
  const cut = text.lastIndexOf(" ", maxLen)
  return text.substring(0, cut > 0 ? cut : maxLen) + "..."
}

async function buildWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = new Color("#0a0a0a")
  widget.setPadding(16, 16, 16, 16)

  const fragment = await getFragment()

  if (!fragment) {
    // nothing due today
    const quiet = widget.addText("nothing today.")
    quiet.font = Font.italicSystemFont(14)
    quiet.textColor = new Color("#555555")
    return widget
  }

  // your actual words, trailing off
  const displayText = truncate(fragment.fragment_text, 120)
  const words = widget.addText(displayText)
  words.font = Font.systemFont(15)
  words.textColor = new Color("#e8e8e8")
  words.lineLimit = 5
  words.minimumScaleFactor = 0.8

  widget.addSpacer(8)

  // time distance
  const distance = timeAgo(fragment.original_date)
  if (distance) {
    const time = widget.addText(distance)
    time.font = Font.systemFont(11)
    time.textColor = new Color("#666666")
  }

  // tag hint (subtle)
  if (fragment.mode) {
    widget.addSpacer(4)
    const mode = widget.addText(fragment.mode)
    mode.font = Font.systemFont(9)
    mode.textColor = new Color("#333333")
  }

  // tap opens full view in Scriptable
  widget.url = `scriptable:///run/flashback-room?id=${fragment.fragment_id}`

  return widget
}

// --- Full view (when tapped) ---

async function showRoom() {
  const args = URLScheme.allParameters()
  const fragmentId = args.id

  if (!fragmentId) {
    // no specific fragment — show today's
    const fragment = await getFragment()
    if (!fragment) {
      const alert = new Alert()
      alert.title = "nothing today."
      alert.addAction("ok")
      await alert.present()
      return
    }
    await presentFragment(fragment)
  }
}

async function presentFragment(fragment) {
  const table = new UITable()
  table.showSeparators = false

  // entry text — full, with fragment highlighted
  const textRow = new UITableRow()
  const textCell = textRow.addText(fragment.entry_text || fragment.fragment_text)
  textCell.titleFont = Font.systemFont(16)
  textCell.titleColor = new Color("#e8e8e8")
  textRow.backgroundColor = new Color("#0a0a0a")
  textRow.height = 300
  table.addRow(textRow)

  // time distance
  if (fragment.original_date) {
    const timeRow = new UITableRow()
    const timeCell = timeRow.addText(timeAgo(fragment.original_date))
    timeCell.titleFont = Font.systemFont(12)
    timeCell.titleColor = new Color("#666666")
    timeRow.backgroundColor = new Color("#0a0a0a")
    table.addRow(timeRow)
  }

  // reflections
  if (fragment.reflections && fragment.reflections.length > 0) {
    const divRow = new UITableRow()
    divRow.addText("—")
    divRow.backgroundColor = new Color("#0a0a0a")
    table.addRow(divRow)

    for (const r of fragment.reflections) {
      const refRow = new UITableRow()
      const refCell = refRow.addText(r.text, timeAgo(r.created_at))
      refCell.titleFont = Font.italicSystemFont(14)
      refCell.titleColor = new Color("#aaaaaa")
      refCell.subtitleColor = new Color("#444444")
      refRow.backgroundColor = new Color("#0a0a0a")
      table.addRow(refRow)
    }
  }

  // action buttons
  const spacerRow = new UITableRow()
  spacerRow.height = 20
  spacerRow.backgroundColor = new Color("#0a0a0a")
  table.addRow(spacerRow)

  const actions = [
    { label: "let it go", action: "let_go", confirm: "archived — you can find it again if you want." },
    { label: "not now", action: "not_now", confirm: "it'll come back." },
    { label: "my dear memory", action: "keep", confirm: "held close." },
  ]

  for (const a of actions) {
    const row = new UITableRow()
    row.backgroundColor = new Color("#0a0a0a")
    row.height = 44
    const cell = row.addText(a.label)
    cell.titleFont = Font.mediumSystemFont(14)
    cell.titleColor = a.action === "keep"
      ? new Color("#e8e8e8")
      : new Color("#555555")

    row.onSelect = async () => {
      const req = new Request(`${API_URL}/action`)
      req.method = "POST"
      req.headers = { "Content-Type": "application/json" }
      req.body = JSON.stringify({
        user_id: USER_ID,
        fragment_id: fragment.fragment_id,
        action: a.action,
      })
      try {
        await req.loadJSON()
      } catch (e) {}

      const alert = new Alert()
      alert.message = a.confirm
      alert.addAction("ok")
      await alert.present()
    }

    table.addRow(row)
  }

  await table.present(false)
}

// --- Entry point ---

if (config.runsInWidget) {
  const widget = await buildWidget()
  Script.setWidget(widget)
} else {
  await showRoom()
}

Script.complete()

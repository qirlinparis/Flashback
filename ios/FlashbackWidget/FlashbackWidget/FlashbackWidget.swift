// FlashbackWidget.swift
// Flashback – SRS widget for iOS
//
// This WidgetKit extension displays the next journal entry due for review
// directly on the Home Screen or Lock Screen. Tapping it opens the main app
// for an in-app review session.
//
// API integration:
//   The widget fetches /review/due from the Flashback backend and picks the
//   first entry. Set FLASHBACK_API_URL in the app's Info.plist (or
//   Config.xcconfig) to point at your deployed backend.

import WidgetKit
import SwiftUI

// MARK: – Model

struct FlashbackEntry: TimelineEntry {
    let date: Date
    let title: String
    let content: String
    let entryId: String
    let dueCount: Int
}

// MARK: – API response types

private struct DueResponse: Decodable {
    let due: [DueItem]
    let count: Int
}

private struct DueItem: Decodable {
    let id: String
    let title: String?
    let content: String
}

// MARK: – Provider

struct FlashbackProvider: TimelineProvider {

    private let maxContentPreviewLength = 280

    private var apiBase: String {
        Bundle.main.infoDictionary?["FLASHBACK_API_URL"] as? String
            ?? "http://localhost:3000"
    }

    func placeholder(in context: Context) -> FlashbackEntry {
        FlashbackEntry(
            date: Date(),
            title: "Your Journal Memory",
            content: "Something you wrote a while ago will surface here…",
            entryId: "",
            dueCount: 0
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (FlashbackEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }
        fetchDue { entry in completion(entry) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FlashbackEntry>) -> Void) {
        fetchDue { entry in
            // Refresh every 4 hours so the widget stays current throughout the day
            let nextRefresh = Calendar.current.date(byAdding: .hour, value: 4, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
            completion(timeline)
        }
    }

    // MARK: Private

    private func fetchDue(completion: @escaping (FlashbackEntry) -> Void) {
        guard let url = URL(string: "\(apiBase)/review/due?limit=1") else {
            completion(errorEntry(message: "Invalid API URL"))
            return
        }

        URLSession.shared.dataTask(with: url) { data, _, error in
            guard let data = data, error == nil,
                  let response = try? JSONDecoder().decode(DueResponse.self, from: data),
                  let first = response.due.first else {
                completion(errorEntry(message: error?.localizedDescription ?? "No entries due"))
                return
            }

            let entry = FlashbackEntry(
                date: Date(),
                title: first.title ?? "Untitled",
                content: String(first.content.prefix(maxContentPreviewLength)),
                entryId: first.id,
                dueCount: response.count
            )
            completion(entry)
        }.resume()
    }

    private func errorEntry(message: String) -> FlashbackEntry {
        FlashbackEntry(
            date: Date(),
            title: "Flashback",
            content: message,
            entryId: "",
            dueCount: 0
        )
    }
}

// MARK: – Widget Views

struct FlashbackWidgetEntryView: View {
    var entry: FlashbackProvider.Entry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            LargeWidgetView(entry: entry)
        }
    }
}

// Small: just the title + due badge
struct SmallWidgetView: View {
    let entry: FlashbackEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "arrow.counterclockwise.circle.fill")
                    .foregroundColor(.accentColor)
                Spacer()
                if entry.dueCount > 0 {
                    Text("\(entry.dueCount)")
                        .font(.caption2.bold())
                        .padding(4)
                        .background(Color.accentColor)
                        .foregroundColor(.white)
                        .clipShape(Circle())
                }
            }
            Spacer()
            Text(entry.title)
                .font(.headline)
                .lineLimit(2)
            Text("Tap to review")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .widgetURL(widgetURL(entryId: entry.entryId))
    }
}

// Medium: title + snippet
struct MediumWidgetView: View {
    let entry: FlashbackEntry

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Label("Flashback", systemImage: "arrow.counterclockwise.circle.fill")
                    .font(.caption.bold())
                    .foregroundColor(.accentColor)
                Text(entry.title)
                    .font(.headline)
                    .lineLimit(2)
                Text(entry.content)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
                Spacer()
                Text("\(entry.dueCount) due today")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding()
        .widgetURL(widgetURL(entryId: entry.entryId))
    }
}

// Large: full card with preview + rating hints
struct LargeWidgetView: View {
    let entry: FlashbackEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Flashback – \(entry.dueCount) due today",
                  systemImage: "arrow.counterclockwise.circle.fill")
                .font(.caption.bold())
                .foregroundColor(.accentColor)

            Divider()

            Text(entry.title)
                .font(.title3.bold())
                .lineLimit(2)

            Text(entry.content)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(8)

            Spacer()

            Text("Tap to open and rate this memory")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .widgetURL(widgetURL(entryId: entry.entryId))
    }
}

// MARK: – Helpers

private func widgetURL(entryId: String) -> URL? {
    guard !entryId.isEmpty else { return URL(string: "flashback://review") }
    return URL(string: "flashback://review/\(entryId)")
}

// MARK: – Widget Configuration

@main
struct FlashbackWidgetBundle: WidgetBundle {
    var body: some Widget {
        FlashbackWidgetMain()
    }
}

struct FlashbackWidgetMain: Widget {
    let kind: String = "FlashbackWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FlashbackProvider()) { entry in
            FlashbackWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Flashback")
        .description("Surface your most important journal memories for review.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: – Previews

#Preview(as: .systemMedium) {
    FlashbackWidgetMain()
} timeline: {
    FlashbackEntry(
        date: .now,
        title: "The day I decided to learn to code",
        content: "I remember sitting at my desk, frustrated with the status quo, and realising I could build the tools I needed if I just learned to write software…",
        entryId: "abc123",
        dueCount: 5
    )
}

import { useState, useEffect, useRef } from "react";

const ENTRIES = [
  {
    id: 1,
    date: "July 4, 2025",
    daysAgo: "8 months ago",
    source: "journal",
    fullText: `Today I went to a café. It is a place full of nature, farmer-like, the cacao was good. But the most important thing is that there were tons of dogs there. I sat on a chair, thinking about things and theories I'm trying to create. And two dogs came. Moving its head towards me, on my left leg, angles left and right placing its head under my hands. I looked at its eyes; I don't have dogs. I never have pets. I don't like the ideas of having pets because in my moral I hate the relationship between humans and animals that calls pet: I hate asymmetric relationship and power dynamics that humans assert to animals. But those eyes were asking my hands to move. And so my hands moved. My brain moved to where someone said to me a person like me needs an experience living with companions that don't demand me anything but my presence — and I stayed present this time, putting my hands and my eyes softly at its eyes, moving my thumbs across its forehead — It stays. I don't typically like dogs and animal much, I'm lazy to wash my hands and my clothes when touching them - that lived inside my head while I moved my hands, patting. Suddenly, the world forgets. And the moments inside my head still running and calculating everything as it always does, but I felt its eyes. I see the tearstain between its right eye and its nose. I felt the cry or the teardrop it might have had before now. It must have been lonely. The café owner told that they found these dogs on the road, unattended, and so they took them in from childhood out of pity — I didn't felt pity. I felt loneliness and cravings. I felt a consciousness waiting to be touched by another's with gentleness: so feather, I gave. There is always this strange feeling of seeing a stranger and touching them, connecting to the souls you will never know how it feels like inside them, and never get closed to.`,
    fragment: `I felt a consciousness waiting to be touched by another's with gentleness: so feather, I gave.`,
    fragmentStart: 1057,
    widgetLine: `"I felt a consciousness waiting to be touched..."`,
    widgetContext: "the café with the dogs",
    reflections: [
      {
        date: "November 12, 2025",
        text: "I got a plant last week. Not the same as a dog. But I water it every morning and I think about presence differently now."
      }
    ]
  },
  {
    id: 2,
    date: "October 16, 2025",
    daysAgo: "5 months ago",
    source: "journal",
    fullText: `I have learnt about how much uncomfortable I am with my own body, especially when it's observed.

Today I do content, a reel video, for Operation III: Hunt the Howl. I see how imperfect my movements are, how it's just uncontrollably fidget with anxiety, how my hand movements and every movement feels unnatural just because I was anxious and tried to perfect it and control it. My voice is also a voice of anxiety. And I hate how all of these feel like inside my body.

I want to be comfortable within my body, or at least, resilient, every time I think about saying something public my heart anxious and my blood felt too much.

Sometimes I could do it regardless. But it's not the state I want to live constantly in my life.`,
    fragment: `I want to be comfortable within my body, or at least, resilient, every time I think about saying something public my heart anxious and my blood felt too much.`,
    widgetLine: `"I want to be comfortable within my body..."`,
    widgetContext: "your body, observed",
    reflections: []
  },
  {
    id: 3,
    date: "February 19, 2025",
    daysAgo: "1 year ago",
    source: "journal",
    fullText: `Flowers, A proof of love in the capitalist world

On Valentine's day, we see many couples buy flowers, or gifts, or taking your lover(s) on a date.

At the same time, we also see how much value many people put into it - especially the expectation for a guy (yes. it is mostly patriarchy) to initiate, buy, or take their lover to somewhere good - and the expectation many times can be a make or break to the relationship.

Why?

If the significance of the day only gives the lovers an excuse to do something special together - then why do we expect that we /must/ do something special together?

We expect because we believe — we believe that a "good couple" or a "good lover" or a "good relationship" means that we, especially men, do something special to the relationship on that day. Or else we dont love our partner.

We should then see clearer that this expectation puts pressure the whole relationship into the hands of external things: what I buy and what I do.

And considering that love is internal, the fact that I feel my love towards you is what builds a relationship, is tested on whether I give you flowers or not - we are lying to ourselves that love can be contained in a bouquet. And we are basically demand that love must be seen and bought through money.

I have never seen ANY person demand that they get a handwritten letter poured by their emotions on the Valentine's day, instead, I only see that, more on the woman side, people demand flowers and dinner dates (and right now also posting on instragram).

A wholehearted letter cost much more attention to express love; a date doing stupid things together also costs much more imagination - but somehow we are so obsessed with whether we give an expensive thing purchasable by money.

So. . . are we truly seeking a proof of love, or the purchasable and showable proof of love?

If showing love sometimes means that I choose to pay an expensive thing even when I don't have to, why must that expensive thing be paid by money?

Is money the most expensive thing in your relationship?`,
    fragment: `So. . . are we truly seeking a proof of love, or the purchasable and showable proof of love?`,
    widgetLine: `"are we truly seeking a proof of love..."`,
    widgetContext: "flowers & capitalism",
    reflections: []
  }
];

// --- Haptic-style feedback ---
const softVibrate = () => {
  if (navigator.vibrate) navigator.vibrate(10);
};

// --- Widget Component (the door) ---
function Widget({ entry, onOpen }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, [entry.id]);

  return (
    <div
      onClick={() => { softVibrate(); onOpen(); }}
      style={{
        background: "rgba(18,18,20,0.85)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderRadius: 22,
        padding: "24px 24px 20px",
        cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.06)",
        maxWidth: 360,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        userSelect: "none",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.25)",
        }} />
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          fontWeight: 500,
        }}>
          Flashback
        </span>
      </div>

      <div style={{
        fontFamily: "'Newsreader', 'Georgia', serif",
        fontSize: 17,
        lineHeight: 1.55,
        color: "rgba(255,255,255,0.82)",
        fontWeight: 400,
        fontStyle: "italic",
        marginBottom: 12,
      }}>
        {entry.widgetLine}
      </div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        color: "rgba(255,255,255,0.22)",
        fontWeight: 400,
      }}>
        {entry.daysAgo}
      </div>
    </div>
  );
}

// --- Full Entry View (the room) ---
function EntryRoom({ entry, onAction, onBack }) {
  const [phase, setPhase] = useState("entering"); // entering, reading, reflecting
  const [reflectionText, setReflectionText] = useState("");
  const [showReflectionInput, setShowReflectionInput] = useState(false);
  const [actionTaken, setActionTaken] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setPhase("reading"), 100);
    return () => clearTimeout(t);
  }, []);

  const renderHighlightedText = (fullText, fragment) => {
    const idx = fullText.indexOf(fragment);
    if (idx === -1) {
      return <span style={{ color: "rgba(255,255,255,0.78)" }}>{fullText}</span>;
    }
    const before = fullText.slice(0, idx);
    const after = fullText.slice(idx + fragment.length);

    return (
      <>
        <span style={{ color: "rgba(255,255,255,0.28)", transition: "color 0.6s" }}>
          {before}
        </span>
        <span style={{
          color: "rgba(255,255,255,0.95)",
          background: "rgba(255,255,255,0.04)",
          borderLeft: "2px solid rgba(255,255,255,0.15)",
          paddingLeft: 12,
          marginLeft: -12,
          display: "inline",
          transition: "all 0.6s",
        }}>
          {fragment}
        </span>
        <span style={{ color: "rgba(255,255,255,0.28)", transition: "color 0.6s" }}>
          {after}
        </span>
      </>
    );
  };

  const handleAction = (action) => {
    softVibrate();
    setActionTaken(action);
    setTimeout(() => onAction(action), 600);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0a0a0c",
      zIndex: 100,
      opacity: phase === "entering" ? 0 : 1,
      transition: "opacity 0.5s ease",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            cursor: "pointer",
            padding: "8px 0",
            letterSpacing: "0.02em",
          }}
        >
          ← back
        </button>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.05em",
        }}>
          {entry.date}
        </span>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px 32px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* The entry text */}
        <div style={{
          fontFamily: "'Newsreader', 'Georgia', serif",
          fontSize: 18,
          lineHeight: 1.75,
          fontWeight: 400,
          whiteSpace: "pre-wrap",
          marginBottom: 40,
          opacity: phase === "entering" ? 0 : 1,
          transform: phase === "entering" ? "translateY(20px)" : "translateY(0)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
        }}>
          {renderHighlightedText(entry.fullText, entry.fragment)}
        </div>

        {/* Past reflections */}
        {entry.reflections.length > 0 && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 24,
            marginBottom: 32,
            opacity: phase === "entering" ? 0 : 1,
            transition: "opacity 0.8s ease 0.6s",
          }}>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.2)",
              marginBottom: 16,
            }}>
              Past reflections
            </div>
            {entry.reflections.map((r, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.15)",
                  marginBottom: 6,
                }}>
                  {r.date}
                </div>
                <div style={{
                  fontFamily: "'Newsreader', 'Georgia', serif",
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.5)",
                  fontStyle: "italic",
                }}>
                  {r.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reflection input - pull up */}
        {showReflectionInput && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 20,
            marginBottom: 20,
            animation: "fadeUp 0.4s ease",
          }}>
            <textarea
              autoFocus
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="what do you think now?"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "16px",
                fontFamily: "'Newsreader', 'Georgia', serif",
                fontSize: 16,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.7)",
                resize: "vertical",
                minHeight: 80,
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom actions */}
      {!actionTaken ? (
        <div style={{
          flexShrink: 0,
          padding: "16px 24px 36px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          opacity: phase === "entering" ? 0 : 1,
          transition: "opacity 0.8s ease 0.8s",
        }}>
          {/* Optional reflection toggle */}
          <div
            onClick={() => setShowReflectionInput(!showReflectionInput)}
            style={{
              textAlign: "center",
              marginBottom: 20,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: showReflectionInput ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
              letterSpacing: "0.03em",
              transition: "color 0.3s",
            }}>
              {showReflectionInput ? "close" : "add a thought"}
            </span>
          </div>

          {/* Action buttons */}
          <div style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
          }}>
            <ActionButton
              label="let it go"
              sublabel=""
              onClick={() => handleAction("forget")}
              style={{
                color: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <ActionButton
              label="not now"
              sublabel=""
              onClick={() => handleAction("later")}
              style={{
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />
            <ActionButton
              label="keep this"
              sublabel=""
              onClick={() => handleAction("keep")}
              style={{
                color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.04)",
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{
          flexShrink: 0,
          padding: "24px 24px 40px",
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.03em",
          }}>
            {actionTaken === "forget" && "archived — you can find it again if you want"}
            {actionTaken === "later" && "it'll come back"}
            {actionTaken === "keep" && "held close"}
          </span>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ActionButton({ label, sublabel, onClick, style: customStyle }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: "none",
        borderRadius: 14,
        padding: "14px 22px",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "0.01em",
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "transform 0.15s ease, background 0.2s",
        minWidth: 90,
        ...customStyle,
      }}
    >
      {label}
    </button>
  );
}

// --- Deep Session View ---
function DeepSession({ entries, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRoom, setShowRoom] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, [currentIndex]);

  const current = entries[currentIndex];

  if (showRoom) {
    return (
      <EntryRoom
        entry={current}
        onBack={() => setShowRoom(false)}
        onAction={(action) => {
          setShowRoom(false);
          if (currentIndex < entries.length - 1) {
            setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
          } else {
            setTimeout(onClose, 300);
          }
        }}
      />
    );
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0a0a0c",
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          left: 20,
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.25)",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          cursor: "pointer",
          padding: "8px 0",
        }}
      >
        ← close
      </button>

      {/* Dots */}
      <div style={{
        position: "absolute",
        top: 22,
        display: "flex",
        gap: 6,
      }}>
        {entries.map((_, i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: i === currentIndex
                ? "rgba(255,255,255,0.5)"
                : i < currentIndex
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(255,255,255,0.08)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        onClick={() => { softVibrate(); setShowRoom(true); }}
        style={{
          maxWidth: 340,
          width: "85%",
          padding: "36px 28px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20,
          cursor: "pointer",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{
          fontFamily: "'Newsreader', 'Georgia', serif",
          fontSize: 20,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.8)",
          fontStyle: "italic",
          marginBottom: 20,
          fontWeight: 400,
        }}>
          {current.widgetLine}
        </div>

        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: "rgba(255,255,255,0.18)",
        }}>
          {current.daysAgo} · {current.widgetContext}
        </div>
      </div>

      {/* Hint */}
      <div style={{
        position: "absolute",
        bottom: 48,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        color: "rgba(255,255,255,0.12)",
        letterSpacing: "0.03em",
      }}>
        tap to open
      </div>
    </div>
  );
}

// --- Main App ---
export default function Flashback() {
  const [view, setView] = useState("home"); // home, room, deep
  const [selectedEntry, setSelectedEntry] = useState(null);
  const todayEntry = ENTRIES[0];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(170deg, #0c0c10 0%, #111118 50%, #0a0a0e 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'DM Sans', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Newsreader:ital,wght@0,400;1,400&display=swap" rel="stylesheet" />

      {/* Subtle ambient glow */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 300,
        height: 300,
        background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Home view */}
      {view === "home" && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          maxWidth: 400,
          width: "100%",
        }}>
          {/* Time context */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.12)",
            fontWeight: 500,
          }}>
            today's flashback
          </div>

          {/* Widget */}
          <Widget
            entry={todayEntry}
            onOpen={() => {
              setSelectedEntry(todayEntry);
              setView("room");
            }}
          />

          {/* Deep session option */}
          <button
            onClick={() => setView("deep")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "12px 20px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: "rgba(255,255,255,0.15)",
              letterSpacing: "0.05em",
              transition: "color 0.3s",
            }}
            onMouseEnter={(e) => e.target.style.color = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.15)"}
          >
            deep session →
          </button>

          {/* Entry count */}
          <div style={{
            position: "absolute",
            bottom: 24,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.08)",
          }}>
            3 entries · 3 fragments
          </div>
        </div>
      )}

      {/* Room view */}
      {view === "room" && selectedEntry && (
        <EntryRoom
          entry={selectedEntry}
          onBack={() => setView("home")}
          onAction={(action) => {
            setTimeout(() => setView("home"), 800);
          }}
        />
      )}

      {/* Deep session */}
      {view === "deep" && (
        <DeepSession
          entries={ENTRIES}
          onClose={() => setView("home")}
        />
      )}
    </div>
  );
}

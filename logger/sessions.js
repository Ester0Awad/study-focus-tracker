// Pure logic: turns Arduino events into finished study sessions.
// Kept separate from the serial port so it can be tested without hardware.

/**
 * Parse one line from the Arduino. Returns the event object, or null for
 * anything that isn't a JSON event (e.g. garbage printed while the board boots).
 */
export function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const event = JSON.parse(trimmed);
    return typeof event.event === "string" ? event : null;
  } catch {
    return null;
  }
}

/**
 * Tracks the current session. Call handle(event, now) for every event;
 * it returns a finished session object when a session ends, otherwise null.
 * `now` is the laptop's Date, because the Arduino's clock resets on reboot.
 */
export class SessionTracker {
  constructor() {
    this.current = null;
  }

  handle(event, now = new Date()) {
    switch (event.event) {
      case "session_start":
        this.current = { started_at: now.toISOString(), away_count: 0 };
        return null;
      case "away":
        if (this.current) this.current.away_count++;
        return null;
      case "boot":
        // The board restarted, so any running session was lost.
        this.current = null;
        return null;
      case "session_end": {
        if (!this.current) return null;
        const session = {
          ...this.current,
          ended_at: now.toISOString(),
          session_minutes: round1(event.session_ms / 60000),
          focus_minutes: round1(event.focus_ms / 60000),
        };
        session.focus_ratio =
          event.session_ms > 0 ? Math.round((event.focus_ms / event.session_ms) * 100) / 100 : 0;
        this.current = null;
        return session;
      }
      default:
        return null;
    }
  }
}

/** Local calendar day of a Date as YYYY-MM-DD. */
export function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Total focus minutes per local day (YYYY-MM-DD), from a list of sessions. */
export function focusByDay(sessions) {
  const days = {};
  for (const s of sessions) {
    const key = dayKey(new Date(s.started_at));
    days[key] = round1((days[key] ?? 0) + s.focus_minutes);
  }
  return days;
}

/**
 * Number of days in a row, up to `today`, with at least `goalMinutes` of focus.
 * If today's goal isn't met yet, the streak counts back from yesterday, so it
 * doesn't drop to 0 in the morning before you've studied.
 */
export function studyStreak(sessions, today = new Date(), goalMinutes = 30) {
  const byDay = focusByDay(sessions);
  const met = (d) => (byDay[dayKey(d)] ?? 0) >= goalMinutes;
  const d = new Date(today);
  if (!met(d)) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (met(d)) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function round1(x) {
  return Math.round(x * 10) / 10;
}

const CSV_COLUMNS = [
  "started_at",
  "ended_at",
  "session_minutes",
  "focus_minutes",
  "focus_ratio",
  "away_count",
];

/** Sessions as CSV text (header + one row per session), for spreadsheets. */
export function sessionsToCsv(sessions) {
  const escape = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = sessions.map((s) => CSV_COLUMNS.map((c) => escape(s[c])).join(","));
  return [CSV_COLUMNS.join(","), ...rows].join("\n") + "\n";
}

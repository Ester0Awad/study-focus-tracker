// Prints a quick text summary of the last 7 days, without opening the dashboard.
// Usage: npm run summary            (your sessions)
//        npm run summary -- --sample (the dashboard's sample data)
import { existsSync, readFileSync } from "node:fs";
import { dayKey, focusByDay, studyStreak } from "./sessions.js";

const file = process.argv.includes("--sample")
  ? new URL("../dashboard/sample-sessions.json", import.meta.url)
  : new URL("../data/sessions.json", import.meta.url);

if (!existsSync(file)) {
  console.error("No data/sessions.json yet. Record a session with the logger, or try --sample.");
  process.exit(1);
}

const sessions = JSON.parse(readFileSync(file, "utf8"));
const byDay = focusByDay(sessions);
const end = sessions.length ? new Date(sessions.at(-1).started_at) : new Date();
const max = Math.max(60, ...Object.values(byDay));

let total = 0;
console.log("Focus minutes, last 7 days\n");
for (let i = 6; i >= 0; i--) {
  const d = new Date(end);
  d.setDate(d.getDate() - i);
  const mins = byDay[dayKey(d)] ?? 0;
  total += mins;
  const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  console.log(`${label.padEnd(12)} ${"█".repeat(Math.round((mins / max) * 30)).padEnd(30)} ${Math.round(mins)}m`);
}
console.log(`\nTotal: ${Math.floor(total / 60)}h ${Math.round(total % 60)}m`);
console.log(`Streak: ${studyStreak(sessions, end)} days with 30+ minutes`);

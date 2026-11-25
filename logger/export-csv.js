// Writes data/sessions.csv from data/sessions.json so sessions can be opened
// in Excel / Google Sheets.  Usage: npm run export-csv
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sessionsToCsv } from "./sessions.js";

const json = new URL("../data/sessions.json", import.meta.url);
const csv = new URL("../data/sessions.csv", import.meta.url);

if (!existsSync(json)) {
  console.error("No data/sessions.json yet. Record a session with the logger first.");
  process.exit(1);
}
const sessions = JSON.parse(readFileSync(json, "utf8"));
writeFileSync(csv, sessionsToCsv(sessions));
console.log(`Wrote ${sessions.length} sessions to data/sessions.csv`);

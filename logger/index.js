// Reads events from the Arduino over USB serial and appends finished sessions
// to data/sessions.json.
//
// Usage:
//   npm start                               (finds the Arduino automatically)
//   npm start -- /dev/tty.usbmodem1101      (macOS; see `ls /dev/tty.usb*`)
//   npm start -- COM3                       (Windows)
//   npm start -- --replay sample-events.txt (no hardware: replay recorded lines)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";
import { parseLine, pickArduinoPort, SessionTracker } from "./sessions.js";

const DATA_FILE = new URL("../data/sessions.json", import.meta.url);

function loadSessions() {
  return existsSync(DATA_FILE) ? JSON.parse(readFileSync(DATA_FILE, "utf8")) : [];
}

function saveSession(session) {
  mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
  const sessions = loadSessions();
  sessions.push(session);
  writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2) + "\n");
  console.log(
    `Saved session: ${session.focus_minutes} focus min of ${session.session_minutes} min (${Math.round(session.focus_ratio * 100)}%)`
  );
}

async function openLines(args) {
  if (args[0] === "--replay") {
    return createInterface({ input: createReadStream(args[1]) });
  }
  const { SerialPort } = await import("serialport");
  const { ReadlineParser } = await import("@serialport/parser-readline");
  const path = args[0] ?? pickArduinoPort(await SerialPort.list());
  if (!path) {
    console.error("No Arduino found. Plug it in, or pass the port: npm start -- <serial port>");
    console.error("(Or try without hardware: npm start -- --replay sample-events.txt)");
    process.exit(1);
  }
  const port = new SerialPort({ path, baudRate: 115200 });
  console.log(`Listening on ${path}...`);
  return port.pipe(new ReadlineParser({ delimiter: "\n" }));
}

const tracker = new SessionTracker();
const lines = await openLines(process.argv.slice(2));
lines.on("line", handle); // readline interface
lines.on("data", handle); // serialport parser

function handle(line) {
  const event = parseLine(String(line));
  if (!event) return;
  console.log(event.event);
  const session = tracker.handle(event);
  if (session) saveSession(session);
}

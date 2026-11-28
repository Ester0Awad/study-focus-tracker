import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLine, SessionTracker, focusByDay, studyStreak, pickArduinoPort } from "../sessions.js";

test("parseLine reads JSON events and ignores noise", () => {
  assert.deepEqual(parseLine('{"event":"present","ms":10}\r'), { event: "present", ms: 10 });
  assert.equal(parseLine("garbage"), null);
  assert.equal(parseLine("{not json"), null);
  assert.equal(parseLine('{"no_event":1}'), null);
});

test("a full session produces focus minutes and away count", () => {
  const t = new SessionTracker();
  const start = new Date("2026-11-23T20:00:00");
  assert.equal(t.handle({ event: "session_start" }, start), null);
  t.handle({ event: "present" });
  t.handle({ event: "away" });
  t.handle({ event: "present" });
  const s = t.handle(
    { event: "session_end", focus_ms: 2696780, session_ms: 3000000 },
    new Date("2026-11-23T20:50:00")
  );
  assert.equal(s.session_minutes, 50);
  assert.equal(s.focus_minutes, 44.9);
  assert.equal(s.focus_ratio, 0.9);
  assert.equal(s.away_count, 1);
  assert.equal(s.started_at, start.toISOString());
});

test("session_end without a start is ignored", () => {
  assert.equal(new SessionTracker().handle({ event: "session_end", focus_ms: 1, session_ms: 1 }), null);
});

test("a reboot drops the running session", () => {
  const t = new SessionTracker();
  t.handle({ event: "session_start" });
  t.handle({ event: "boot" });
  assert.equal(t.handle({ event: "session_end", focus_ms: 1000, session_ms: 1000 }), null);
});

test("focusByDay sums focus minutes per local day", () => {
  const days = focusByDay([
    { started_at: new Date("2026-11-22T10:00:00").toISOString(), focus_minutes: 30 },
    { started_at: new Date("2026-11-22T15:00:00").toISOString(), focus_minutes: 15.5 },
    { started_at: new Date("2026-11-23T09:00:00").toISOString(), focus_minutes: 40 },
  ]);
  assert.deepEqual(days, { "2026-11-22": 45.5, "2026-11-23": 40 });
});

test("sessionsToCsv writes a header and one row per session", async () => {
  const { sessionsToCsv } = await import("../sessions.js");
  const csv = sessionsToCsv([
    {
      started_at: "2026-11-24T20:00:00.000Z",
      ended_at: "2026-11-24T20:50:00.000Z",
      session_minutes: 50,
      focus_minutes: 44.9,
      focus_ratio: 0.9,
      away_count: 1,
    },
  ]);
  assert.equal(
    csv,
    "started_at,ended_at,session_minutes,focus_minutes,focus_ratio,away_count\n" +
      "2026-11-24T20:00:00.000Z,2026-11-24T20:50:00.000Z,50,44.9,0.9,1\n"
  );
});

test("sessionsToCsv with no sessions is just the header", async () => {
  const { sessionsToCsv } = await import("../sessions.js");
  assert.equal(sessionsToCsv([]).split("\n")[1], "");
});

const day = (date, focus_minutes) => ({ started_at: `${date}T20:00:00`, focus_minutes });

test("studyStreak counts consecutive days that meet the goal", () => {
  const sessions = [day("2026-11-22", 45), day("2026-11-24", 40), day("2026-11-25", 20), day("2026-11-25", 15), day("2026-11-26", 60)];
  // 24th, 25th (20 + 15 = 35) and 26th meet 30 minutes; the 23rd breaks the chain.
  assert.equal(studyStreak(sessions, new Date("2026-11-26T22:00:00")), 3);
});

test("studyStreak keeps yesterday's streak until today is over", () => {
  const sessions = [day("2026-11-24", 40), day("2026-11-25", 50)];
  assert.equal(studyStreak(sessions, new Date("2026-11-26T09:00:00")), 2);
  assert.equal(studyStreak(sessions, new Date("2026-11-27T09:00:00")), 0);
});

test("studyStreak respects a custom goal", () => {
  const sessions = [day("2026-11-25", 40), day("2026-11-26", 40)];
  assert.equal(studyStreak(sessions, new Date("2026-11-26T22:00:00"), 60), 0);
});

test("pickArduinoPort finds the Arduino among other serial ports", () => {
  const ports = [
    { path: "/dev/tty.Bluetooth-Incoming-Port" },
    { path: "/dev/tty.usbmodem1101", vendorId: "2341", manufacturer: "Arduino (www.arduino.cc)" },
  ];
  assert.equal(pickArduinoPort(ports), "/dev/tty.usbmodem1101");
  assert.equal(pickArduinoPort([{ path: "COM5", vendorId: "1A86" }]), "COM5"); // CH340 clone
  assert.equal(pickArduinoPort([{ path: "/dev/tty.Bluetooth-Incoming-Port" }]), null);
});

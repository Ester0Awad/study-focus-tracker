# Contributing

Thanks for your interest! Bug reports, ideas and pull requests are all welcome.

## Run it without the hardware

You don't need an Arduino to work on the logger or dashboard:

```sh
cd logger
npm ci
npm test                                  # unit tests (node:test)
npm start -- --replay sample-events.txt   # feed recorded events through the logger
npm run dashboard                         # http://localhost:5173, uses sample data
```

## Project layout

| Folder | What's in it |
|---|---|
| `firmware/` | Arduino sketch: reads the distance sensor and button, prints JSON events |
| `logger/sessions.js` | Pure logic (parsing, sessions, streaks, CSV). Add tests here first. |
| `logger/*.js` | Command-line tools: serial logger, dashboard server, CSV export, summary |
| `dashboard/` | Single-page dashboard (plain HTML + JS, no build step) |

## Pull requests

- Keep each PR to one change, and add or update a test in `logger/test/` when you change `sessions.js`.
- Make sure `npm test` passes. GitHub Actions runs it on every push.
- If you change the firmware, say which board you tested it on.

// Serves the dashboard at http://localhost:5173 and the saved sessions at /api/sessions.
// If there's no real data yet, it serves sample data so the dashboard still works.
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";

const PORT = process.env.PORT || 5173;
const root = new URL("../", import.meta.url);
const files = {
  "/": ["dashboard/index.html", "text/html"],
  "/sessions.js": ["logger/sessions.js", "text/javascript"],
};

createServer((req, res) => {
  if (req.url === "/api/sessions") {
    const real = new URL("data/sessions.json", root);
    const file = existsSync(real) ? real : new URL("dashboard/sample-sessions.json", root);
    res.writeHead(200, { "Content-Type": "application/json", "X-Sample-Data": String(!existsSync(real)) });
    return res.end(readFileSync(file));
  }
  const match = files[req.url];
  if (!match) {
    res.writeHead(404);
    return res.end("Not found");
  }
  res.writeHead(200, { "Content-Type": match[1] });
  res.end(readFileSync(new URL(match[0], root)));
}).listen(PORT, () => console.log(`Dashboard: http://localhost:${PORT}`));

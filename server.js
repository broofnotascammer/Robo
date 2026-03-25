import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Groq free API ─────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.1-8b-instant";

async function askGroq(systemPrompt, userMessage) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      temperature: 0.1,
      max_tokens:  300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ── Serve HTML files inline (no fs dependency issues on cloud) ────────
// Dashboard and mobile HTML are embedded so no file path issues on Railway
const DASHBOARD_HTML = fs.readFileSync(path.join(__dirname, "dashboard.html"), "utf8");
const MOBILE_HTML    = fs.readFileSync(path.join(__dirname, "mobile.html"),    "utf8");

// ── HTTP server ───────────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/dashboard") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(DASHBOARD_HTML);
  } else if (req.url === "/mobile") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(MOBILE_HTML);
  } else if (req.url === "/health") {
    // Health check endpoint — Railway uses this
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", robot: robotSocket !== null }));
  } else {
    res.writeHead(404); res.end();
  }
});

const wss = new WebSocketServer({ noServer: true });
const dashboardClients = new Set();
let robotSocket = null, robotExecuting = false, lastTelemetry = null, claudePending = false;
const commandLog = [];

// ── Logging ───────────────────────────────────────────────────────────
function log(entry) {
  const e = { ...entry, time: new Date().toISOString() };
  commandLog.unshift(e);
  if (commandLog.length > 150) commandLog.pop();
  broadcast({ type: "log", data: e });
  console.log(`[${e.time.slice(11,19)}]`, JSON.stringify(entry));
}

function broadcast(msg) {
  const raw = JSON.stringify(msg);
  for (const c of dashboardClients) if (c.readyState === 1) c.send(raw);
}

// ── AI navigation ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You control a robot. Reply ONLY with a JSON array of commands. No text, no explanation, no markdown.

Commands:
{"action":"move","direction":"forward","distance_cm":30}
{"action":"move","direction":"backward","distance_cm":20}
{"action":"turn","direction":"left","degrees":90}
{"action":"turn","direction":"right","degrees":45}
{"action":"stop"}
{"action":"wait","duration":300}

Rules:
- obstacle_distance_cm < 40: turn before moving forward
- emergency_stop true: turn first
- 2-4 commands per reply, distances 10-100cm, turns 15-180deg
- reply [] if unsure`;

async function getNavDecision(telemetry) {
  const raw = await askGroq(SYSTEM_PROMPT, `Telemetry: ${JSON.stringify(telemetry)}`);
  let commands;
  try { commands = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { commands = []; }

  let english = "Navigating.";
  try { english = await askGroq("One short sentence: what is a robot doing and why?", `Commands: ${JSON.stringify(commands)} Sensors: ${JSON.stringify(telemetry)}`); }
  catch {}

  return { commands, english };
}

// ── Robot connection ──────────────────────────────────────────────────
function handleRobotConnection(ws) {
  robotSocket = ws;
  log({ source: "server", type: "connection", message: "ESP32 connected" });
  broadcast({ type: "status", data: { connected: true } });

  let heartbeat = setInterval(() => {
    if (Date.now() - (lastTelemetry?.receivedAt || 0) > 3000)
      broadcast({ type: "heartbeat", data: { stale: true } });
  }, 3000);

  ws.on("message", async (data) => {
    let telemetry;
    try { telemetry = JSON.parse(data); } catch { return; }

    lastTelemetry = { ...telemetry, receivedAt: Date.now() };
    robotExecuting = telemetry.executing || false;
    log({ source: "robot", type: "telemetry", data: telemetry });
    broadcast({ type: "telemetry", data: telemetry });

    if (!robotExecuting && !claudePending) {
      claudePending = true;
      try {
        const decision = await getNavDecision(telemetry);
        log({ source: "claude", type: "decision", english: decision.english, commands: decision.commands });
        if (decision.commands.length > 0 && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: "commands", commands: decision.commands }));
          log({ source: "server", type: "sent", message: `Sent ${decision.commands.length} command(s)` });
        }
      } catch (err) {
        log({ source: "server", type: "error", message: `AI error: ${err.message}` });
      } finally { claudePending = false; }
    }
  });

  ws.on("close", () => {
    clearInterval(heartbeat);
    robotSocket = null; claudePending = false;
    log({ source: "server", type: "connection", message: "Robot disconnected" });
    broadcast({ type: "status", data: { connected: false } });
  });
}

// ── Dashboard connection ──────────────────────────────────────────────
function handleDashboardConnection(ws) {
  dashboardClients.add(ws);
  ws.send(JSON.stringify({
    type: "init",
    data: { robotConnected: robotSocket !== null, log: commandLog.slice(0, 60), telemetry: lastTelemetry }
  }));
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "manual_command" && robotSocket?.readyState === 1) {
        robotSocket.send(JSON.stringify({ type: "commands", commands: [msg.command] }));
        log({ source: "dashboard", type: "manual", command: msg.command });
      }
    } catch {}
  });
  ws.on("close", () => dashboardClients.delete(ws));
}

// ── WebSocket routing ─────────────────────────────────────────────────
httpServer.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    if      (req.url === "/robot")     handleRobotConnection(ws);
    else if (req.url === "/dashboard") handleDashboardConnection(ws);
    else ws.close();
  });
});

// ── PORT: Railway injects this automatically ──────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🤖 Robot AI Server — Cloud Edition`);
  console.log(`   Port:      ${PORT}`);
  console.log(`   Model:     ${GROQ_MODEL}`);
  console.log(`   Mobile:    /mobile`);
  console.log(`   Robot WS:  /robot\n`);
});

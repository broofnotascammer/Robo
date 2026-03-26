import { WebSocketServer } from "ws";
import http from "http";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.1-8b-instant";

async function askGroq(systemPrompt, userMessage) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, temperature: 0.1, max_tokens: 300,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  return (await res.json()).choices[0].message.content.trim();
}

const MOBILE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="theme-color" content="#07070f"/>
<title>Robot AI</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;700;900&display=swap');
:root{--bg:#07070f;--panel:#0e0e1a;--card:#13131f;--border:#1e1e30;--accent:#00ff9f;--amber:#ffb800;--red:#ff2d55;--blue:#00b4ff;--purple:#c084fc;--text:#ccd0e0;--muted:#44445e}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{background:var(--bg);color:var(--text);font-family:'Share Tech Mono',monospace;min-height:100dvh;padding-bottom:env(safe-area-inset-bottom)}
.hdr{position:sticky;top:0;z-index:100;background:var(--panel);border-bottom:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;justify-content:space-between}
.logo{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.2rem;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);text-shadow:0 0 16px var(--accent)}
.logo span{color:var(--text);font-weight:300}
.status-pill{display:flex;align-items:center;gap:7px;font-size:.65rem;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.led{width:9px;height:9px;border-radius:50%;background:var(--red);box-shadow:0 0 8px var(--red);transition:all .4s}
.led.on{background:var(--accent);box-shadow:0 0 14px var(--accent);animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.tabs{display:grid;grid-template-columns:repeat(3,1fr);background:var(--panel);border-bottom:1px solid var(--border);position:sticky;top:53px;z-index:99}
.tab{padding:12px 0;text-align:center;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
.tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.page{display:none;padding:14px}
.page.active{display:flex;flex-direction:column;gap:12px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.card-title{font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.dist-hero{text-align:center;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:10px}
.dist-big{font-family:'Barlow Condensed',sans-serif;font-size:5rem;font-weight:900;line-height:1;color:var(--accent);text-shadow:0 0 40px var(--accent);transition:color .3s}
.dist-big.warn{color:var(--amber);text-shadow:0 0 40px var(--amber)}
.dist-big.crit{color:var(--red);text-shadow:0 0 40px var(--red);animation:blink .4s infinite}
.dist-unit{font-size:.8rem;color:var(--muted);margin-top:4px}
.dist-bar{height:6px;background:var(--border);border-radius:3px;margin-top:14px;overflow:hidden}
.dist-fill{height:100%;border-radius:3px;background:var(--accent);transition:width .5s,background .3s}
.safety-row{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px;transition:border-color .3s}
.safety-dot{font-size:1.3rem}.safety-label{font-size:.85rem}.safety-sub{font-size:.65rem;color:var(--muted);margin-top:2px}
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;text-align:center}
.stat-n{font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:900;color:var(--accent);line-height:1}
.stat-n.red{color:var(--red)}.stat-l{font-size:.58rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-top:3px}
.enc-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.enc-card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 12px}
.enc-n{font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:700;color:var(--blue)}
.enc-l{font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
.mode-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mode-btn{padding:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--muted);font-family:'Share Tech Mono',monospace;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;transition:all .2s;text-align:center}
.mode-btn.on{border-color:var(--accent);color:var(--accent);background:#00140a}
.dpad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.dp{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:18px 0;text-align:center;font-size:1.3rem;cursor:pointer;transition:all .12s;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.dp:active,.dp.pressed{background:#001a10;border-color:var(--accent);transform:scale(.93)}
.dp.stop{border-color:var(--red)}.dp.stop:active{background:#1a0010}.dp.ghost{visibility:hidden}.dp.off{opacity:.25;pointer-events:none}
.prec-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.prec-label{font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
.prec-input{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:.85rem;padding:10px 12px;border-radius:7px;outline:none}
.prec-input:focus{border-color:var(--accent)}
.prec-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.prec-btn{padding:12px;border-radius:8px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;border:1px solid var(--accent);color:var(--accent);background:var(--card);transition:all .15s;touch-action:manipulation}
.prec-btn:active{background:#001a10}.prec-btn.turn{border-color:var(--amber);color:var(--amber)}.prec-btn.turn:active{background:#1a1000}
.log-feed{display:flex;flex-direction:column;gap:7px}
.entry{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--border);border-radius:8px;padding:10px 12px;font-size:.72rem;line-height:1.5;animation:pop .2s ease}
@keyframes pop{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
.entry.s-claude{border-left-color:var(--purple)}.entry.s-robot{border-left-color:var(--accent)}.entry.s-server{border-left-color:var(--blue)}.entry.s-dashboard{border-left-color:var(--amber)}
.e-top{display:flex;gap:8px;margin-bottom:4px;font-size:.62rem;color:var(--muted)}
.src{font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.src.claude{color:var(--purple)}.src.robot{color:var(--accent)}.src.server{color:var(--blue)}.src.dashboard{color:var(--amber)}
.e-eng{font-style:italic;color:var(--text);margin-bottom:5px}
.cmd-row{display:flex;flex-wrap:wrap;gap:4px}
.cmd-tag{background:#0a1828;border:1px solid #142840;color:var(--blue);border-radius:3px;padding:1px 6px;font-size:.63rem}
.tele-val{color:var(--accent);font-size:.68rem}
</style>
</head>
<body>
<div class="hdr">
  <div class="logo">Robot<span>.</span>AI</div>
  <div class="status-pill"><div class="led" id="led"></div><span id="statusTxt">Offline</span></div>
</div>
<div class="tabs">
  <div class="tab active" onclick="showTab('status')">Status</div>
  <div class="tab" onclick="showTab('control')">Control</div>
  <div class="tab" onclick="showTab('log')">Log</div>
</div>
<div class="page active" id="tab-status">
  <div class="dist-hero">
    <div class="dist-big" id="distBig">--</div>
    <div class="dist-unit">cm ahead</div>
    <div class="dist-bar"><div class="dist-fill" id="distFill" style="width:100%"></div></div>
  </div>
  <div class="safety-row" id="safetyRow">
    <div class="safety-dot" id="safetyDot">green_circle</div>
    <div><div class="safety-label" id="safetyLabel">All Clear</div><div class="safety-sub">ESP32 local emergency stop: ACTIVE</div></div>
  </div>
  <div class="stats-row">
    <div class="stat-card"><div class="stat-n" id="sDec">0</div><div class="stat-l">Decisions</div></div>
    <div class="stat-card"><div class="stat-n" id="sCmd">0</div><div class="stat-l">Commands</div></div>
    <div class="stat-card"><div class="stat-n red" id="sEstop">0</div><div class="stat-l">E-Stops</div></div>
  </div>
  <div class="card">
    <div class="card-title">Encoders</div>
    <div class="enc-row">
      <div class="enc-card"><div class="enc-l">Left</div><div class="enc-n" id="encL">0</div></div>
      <div class="enc-card"><div class="enc-l">Right</div><div class="enc-n" id="encR">0</div></div>
    </div>
  </div>
</div>
<div class="page" id="tab-control">
  <div class="card">
    <div class="card-title">Mode</div>
    <div class="mode-row">
      <button class="mode-btn on" id="btnAuto" onclick="setMode('auto')">Auto AI</button>
      <button class="mode-btn" id="btnManual" onclick="setMode('manual')">Manual</button>
    </div>
  </div>
  <div class="card" id="dpadCard" style="display:none">
    <div class="card-title">Drive</div>
    <div class="dpad">
      <div class="dp ghost"></div>
      <div class="dp" ontouchstart="holdStart('fwd',this)" ontouchend="holdEnd()" onmousedown="holdStart('fwd',this)" onmouseup="holdEnd()">up_arrow</div>
      <div class="dp ghost"></div>
      <div class="dp" ontouchstart="holdStart('left',this)" ontouchend="holdEnd()" onmousedown="holdStart('left',this)" onmouseup="holdEnd()">left_arrow</div>
      <div class="dp stop" onclick="manualSend({action:'stop'})">stop_square</div>
      <div class="dp" ontouchstart="holdStart('right',this)" ontouchend="holdEnd()" onmousedown="holdStart('right',this)" onmouseup="holdEnd()">right_arrow</div>
      <div class="dp ghost"></div>
      <div class="dp" ontouchstart="holdStart('bwd',this)" ontouchend="holdEnd()" onmousedown="holdStart('bwd',this)" onmouseup="holdEnd()">down_arrow</div>
      <div class="dp ghost"></div>
    </div>
  </div>
  <div class="card" id="precCard" style="display:none">
    <div class="card-title">Precision Command</div>
    <div class="prec-grid">
      <div><div class="prec-label">Distance (cm)</div><input class="prec-input" id="pDist" type="number" value="20" min="1" max="200"></div>
      <div><div class="prec-label">Turn (degrees)</div><input class="prec-input" id="pDeg" type="number" value="90" min="1" max="360"></div>
    </div>
    <div class="prec-btns">
      <button class="prec-btn" onclick="sendMove('forward')">Forward</button>
      <button class="prec-btn" onclick="sendMove('backward')">Backward</button>
      <button class="prec-btn turn" onclick="sendTurn('left')">Turn Left</button>
      <button class="prec-btn turn" onclick="sendTurn('right')">Turn Right</button>
    </div>
  </div>
</div>
<div class="page" id="tab-log">
  <div class="log-feed" id="logFeed">
    <div class="entry s-server"><div class="e-top"><span class="src server">Server</span><span>Waiting for robot...</span></div></div>
  </div>
</div>
<script>
var proto=location.protocol==='https:'?'wss://':'ws://';
var WS_URL=proto+location.host+'/dashboard';
var ws,robotOn=false,mode='auto',dec=0,cmd=0,estop=0,holdTimer=null;
function connect(){
  ws=new WebSocket(WS_URL);
  ws.onmessage=function(e){
    var m=JSON.parse(e.data);
    if(m.type==='init'){setStatus(m.data.robotConnected);m.data.log.slice(0,30).reverse().forEach(addEntry);if(m.data.telemetry)processTele(m.data.telemetry);}
    else if(m.type==='status')setStatus(m.data.connected);
    else if(m.type==='log'){addEntry(m.data);processLog(m.data);}
    else if(m.type==='telemetry')processTele(m.data);
  };
  ws.onclose=function(){setTimeout(connect,3000);};
}
function setStatus(on){
  robotOn=on;
  document.getElementById('led').className='led'+(on?' on':'');
  document.getElementById('statusTxt').textContent=on?'Online':'Offline';
  document.querySelectorAll('.dp:not(.ghost):not(.stop)').forEach(function(d){d.classList.toggle('off',!on);});
}
function processTele(t){
  var d=t.obstacle_distance_cm;
  var el=document.getElementById('distBig');
  el.textContent=d>=999?'inf':d.toFixed(1);
  el.className='dist-big'+(d<18?' crit':d<50?' warn':'');
  var fill=document.getElementById('distFill');
  fill.style.width=Math.min(100,(d/200)*100)+'%';
  fill.style.background=d<18?'var(--red)':d<50?'var(--amber)':'var(--accent)';
  var emg=t.emergency_stop;
  document.getElementById('safetyLabel').textContent=emg?'EMERGENCY STOP':'All Clear';
  document.getElementById('safetyRow').style.borderColor=emg?'var(--red)':'var(--border)';
  if(emg){estop++;document.getElementById('sEstop').textContent=estop;}
  document.getElementById('encL').textContent=t.enc_left!=null?t.enc_left:'--';
  document.getElementById('encR').textContent=t.enc_right!=null?t.enc_right:'--';
}
function processLog(e){
  if(e.source==='claude'&&e.type==='decision'){dec++;document.getElementById('sDec').textContent=dec;}
  if(e.type==='sent'){cmd++;document.getElementById('sCmd').textContent=cmd;}
}
function addEntry(e){
  var feed=document.getElementById('logFeed');
  var div=document.createElement('div');
  div.className='entry s-'+e.source;
  var t=new Date(e.time).toLocaleTimeString('en-GB',{hour12:false});
  var html='<div class="e-top"><span class="src '+e.source+'">'+e.source+'</span><span>'+t+'</span><span style="color:var(--muted)">'+e.type+'</span></div>';
  if(e.english)html+='<div class="e-eng">"'+e.english+'"</div>';
  if(e.commands&&e.commands.length){html+='<div class="cmd-row">';e.commands.forEach(function(c){html+='<span class="cmd-tag">'+fmtCmd(c)+'</span>';});html+='</div>';}
  if(e.message&&!e.english)html+='<span style="color:var(--muted);font-size:.68rem">'+e.message+'</span>';
  div.innerHTML=html;
  feed.insertBefore(div,feed.firstChild);
  while(feed.children.length>60)feed.removeChild(feed.lastChild);
}
function fmtCmd(c){
  if(c.action==='move')return c.direction+' '+c.distance_cm+'cm';
  if(c.action==='turn')return c.direction+' '+c.degrees+'deg';
  if(c.action==='stop')return 'stop';
  return c.action;
}
function showTab(name){
  document.querySelectorAll('.tab').forEach(function(t,i){t.classList.toggle('active',['status','control','log'][i]===name);});
  document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id==='tab-'+name);});
}
function setMode(m){
  mode=m;
  document.getElementById('btnAuto').classList.toggle('on',m==='auto');
  document.getElementById('btnManual').classList.toggle('on',m==='manual');
  document.getElementById('dpadCard').style.display=m==='manual'?'block':'none';
  document.getElementById('precCard').style.display=m==='manual'?'block':'none';
}
var HOLD={fwd:{action:'move',direction:'forward',distance_cm:8},bwd:{action:'move',direction:'backward',distance_cm:8},left:{action:'turn',direction:'left',degrees:12},right:{action:'turn',direction:'right',degrees:12}};
function holdStart(dir,el){if(!robotOn)return;if(el)el.classList.add('pressed');manualSend(HOLD[dir]);holdTimer=setInterval(function(){manualSend(HOLD[dir]);},550);}
function holdEnd(){clearInterval(holdTimer);document.querySelectorAll('.dp.pressed').forEach(function(e){e.classList.remove('pressed');});if(robotOn)manualSend({action:'stop'});}
function sendMove(dir){manualSend({action:'move',direction:dir,distance_cm:parseFloat(document.getElementById('pDist').value)});}
function sendTurn(dir){manualSend({action:'turn',direction:dir,degrees:parseFloat(document.getElementById('pDeg').value)});}
function manualSend(command){if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'manual_command',command:command}));}
connect();
</script>
</body>
</html>`;

const httpServer = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/dashboard' || req.url === '/mobile') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(MOBILE_HTML);
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', robot: robotSocket !== null }));
  } else {
    res.writeHead(404); res.end();
  }
});

const wss = new WebSocketServer({ noServer: true });
const dashboardClients = new Set();
let robotSocket = null, robotExecuting = false, lastTelemetry = null, claudePending = false;
const commandLog = [];

function log(entry) {
  const e = { ...entry, time: new Date().toISOString() };
  commandLog.unshift(e);
  if (commandLog.length > 150) commandLog.pop();
  broadcast({ type: 'log', data: e });
  console.log(`[${e.time.slice(11,19)}]`, JSON.stringify(entry));
}

function broadcast(msg) {
  const raw = JSON.stringify(msg);
  for (const c of dashboardClients) if (c.readyState === 1) c.send(raw);
}

const SYSTEM_PROMPT = `You control a robot. Reply ONLY with a JSON array of commands. No text, no explanation, no markdown.
Commands:
{"action":"move","direction":"forward","distance_cm":30}
{"action":"move","direction":"backward","distance_cm":20}
{"action":"turn","direction":"left","degrees":90}
{"action":"turn","direction":"right","degrees":45}
{"action":"stop"}
Rules: obstacle_distance_cm<40 means turn before moving forward. emergency_stop true means turn first. 2-4 commands per reply. distances 10-100cm, turns 15-180deg. reply [] if unsure.`;

async function getNavDecision(telemetry) {
  const raw = await askGroq(SYSTEM_PROMPT, `Telemetry: ${JSON.stringify(telemetry)}`);
  let commands;
  try { commands = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { commands = []; }
  let english = 'Navigating.';
  try { english = await askGroq('One short sentence: what is a robot doing and why?', `Commands: ${JSON.stringify(commands)} Sensors: ${JSON.stringify(telemetry)}`); }
  catch {}
  return { commands, english };
}

function handleRobotConnection(ws) {
  robotSocket = ws;
  log({ source: 'server', type: 'connection', message: 'ESP32 connected' });
  broadcast({ type: 'status', data: { connected: true } });
  let heartbeat = setInterval(() => {
    if (Date.now() - (lastTelemetry?.receivedAt || 0) > 3000)
      broadcast({ type: 'heartbeat', data: { stale: true } });
  }, 3000);
  ws.on('message', async (data) => {
    let telemetry;
    try { telemetry = JSON.parse(data); } catch { return; }
    lastTelemetry = { ...telemetry, receivedAt: Date.now() };
    robotExecuting = telemetry.executing || false;
    log({ source: 'robot', type: 'telemetry', data: telemetry });
    broadcast({ type: 'telemetry', data: telemetry });
    if (!robotExecuting && !claudePending) {
      claudePending = true;
      try {
        const decision = await getNavDecision(telemetry);
        log({ source: 'claude', type: 'decision', english: decision.english, commands: decision.commands });
        if (decision.commands.length > 0 && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'commands', commands: decision.commands }));
          log({ source: 'server', type: 'sent', message: `Sent ${decision.commands.length} command(s)` });
        }
      } catch (err) {
        log({ source: 'server', type: 'error', message: `AI error: ${err.message}` });
      } finally { claudePending = false; }
    }
  });
  ws.on('close', () => {
    clearInterval(heartbeat);
    robotSocket = null; claudePending = false;
    log({ source: 'server', type: 'connection', message: 'Robot disconnected' });
    broadcast({ type: 'status', data: { connected: false } });
  });
}

function handleDashboardConnection(ws) {
  dashboardClients.add(ws);
  ws.send(JSON.stringify({ type: 'init', data: { robotConnected: robotSocket !== null, log: commandLog.slice(0, 60), telemetry: lastTelemetry } }));
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'manual_command' && robotSocket?.readyState === 1) {
        robotSocket.send(JSON.stringify({ type: 'commands', commands: [msg.command] }));
        log({ source: 'dashboard', type: 'manual', command: msg.command });
      }
    } catch {}
  });
  ws.on('close', () => dashboardClients.delete(ws));
}

httpServer.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    if (req.url === '/robot') handleRobotConnection(ws);
    else if (req.url === '/dashboard') handleDashboardConnection(ws);
    else ws.close();
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Robot AI running on port ${PORT}`);
});

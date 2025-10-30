#!/usr/bin/env node

// Dashboard Server (CommonJS)
// Serves the dashboard UI and provides API endpoints for real-time data

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const net = require('net');
const fsSync = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.DASHBOARD_PORT || 3000;
const SOCKET_PATH = process.env.MCP_SOCKET || `/run/user/${process.getuid()}/tmux-orchestrator-mcp.sock`;

// Persistent MCP child process (fallback when socket not available)
let mcpProc = null;
let mcpBuffer = '';
const mcpPending = new Map();
let mcpIdCounter = 1;

function startMcpChild() {
  if (mcpProc) return;
  const py = path.join(__dirname, '..', 'mcp_server_tmux.py');
  mcpProc = spawn('python3', [py], { stdio: ['pipe', 'pipe', 'pipe'] });
  mcpProc.stdout.setEncoding('utf8');

  mcpProc.stdout.on('data', (chunk) => {
    mcpBuffer += chunk;
    const lines = mcpBuffer.split(/\r?\n/);
    mcpBuffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const id = parsed.id;
        const resolver = mcpPending.get(id);
        if (resolver) {
          resolver(parsed.result || parsed);
          mcpPending.delete(id);
        }
      } catch (e) {
        console.error('Failed to parse MCP output line:', e.message);
      }
    }
  });

  mcpProc.stderr.setEncoding('utf8');
  mcpProc.stderr.on('data', (d) => console.error('[MCP stderr]', d.toString()));

  mcpProc.on('exit', (code, signal) => {
    console.error(`MCP child exited (code=${code} signal=${signal}), will restart`);
    mcpProc = null;
    for (const [id, resolver] of mcpPending.entries()) {
      resolver({ error: 'MCP process exited' });
      mcpPending.delete(id);
    }
    setTimeout(() => startMcpChild(), 1000);
  });
}

// Send request to MCP. Prefer Unix socket if available, else use persistent child.
async function sendMcpRequest(method, params, timeout = 5000) {
  if (fsSync.existsSync(SOCKET_PATH)) {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(SOCKET_PATH, () => {});
      let buf = '';
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; client.destroy(); reject(new Error('MCP socket request timed out')); }, timeout);
      client.setEncoding('utf8');
      client.on('connect', () => {
        const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) + '\n';
        client.write(payload);
      });
      client.on('data', (chunk) => {
        buf += chunk;
        if (buf.indexOf('\n') !== -1) {
          clearTimeout(timer);
          const line = buf.split(/\r?\n/)[0];
          client.end();
          if (timedOut) return;
          try { const parsed = JSON.parse(line); resolve(parsed.result || parsed); } catch (e) { reject(e); }
        }
      });
      client.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
  }

  // fallback to child
  if (!mcpProc) startMcpChild();
  return new Promise((resolve, reject) => {
    const id = mcpIdCounter++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    const cleanup = () => { if (mcpPending.has(id)) mcpPending.delete(id); };
    mcpPending.set(id, (res) => { cleanup(); resolve(res); });
    try { mcpProc.stdin.write(payload, 'utf8'); } catch (e) { cleanup(); return reject(e); }
    setTimeout(() => { if (mcpPending.has(id)) { cleanup(); reject(new Error('MCP request timed out')); } }, timeout);
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Serve dashboard HTML
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const html = await fs.readFile(path.join(__dirname, 'index.html'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      res.writeHead(500);
      res.end('Error loading dashboard');
    }
    return;
  }

  // API: Get system stats (live via MCP)
  if (req.url === '/api/stats') {
    try {
      const result = await sendMcpRequest('tmux/list_sessions', {});
      const sessions = result && result.sessions ? result.sessions : [];
      const stats = {
        totalAgencies: sessions.length,
        activeSessions: sessions.filter(s => s.attached).length,
        totalDirectives: 0,
        successRate: '0%',
        freeUsage: '75%',
        timestamp: new Date().toISOString()
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // API: Get tmux panels (live via MCP)
  if (req.url === '/api/panels') {
    try {
      const result = await sendMcpRequest('tmux/list_sessions', {});
      const sessions = (result && result.sessions) || [];
      const panels = [];
      for (const s of sessions) {
        for (const w of s.windows || []) {
          panels.push({ name: w.name || 'panel', type: w.name === 'Project Manager' ? 'pm' : 'agent', status: w.active ? 'active' : 'idle', session: s.name, panel: w.index });
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(panels));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // API: Get agencies (live via registry file if present, otherwise from Agencies directory)
  if (req.url === '/api/agencies') {
    try {
      const registryPath = path.join(__dirname, '..', 'registry', 'active_agencies.json');
      let agencies = [];
      try {
        const data = await fs.readFile(registryPath, 'utf-8');
        const parsed = JSON.parse(data);
        agencies = parsed.agencies || [];
      } catch (e) {
        const agenciesDir = path.join(__dirname, '..', 'Agencies');
        try {
          const entries = await fs.readdir(agenciesDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const cfgPath = path.join(agenciesDir, entry.name, 'agency.json');
              try {
                const raw = await fs.readFile(cfgPath, 'utf-8');
                const cfg = JSON.parse(raw);
                agencies.push({ name: cfg.name || entry.name, description: cfg.description || '', agents: (cfg.agents || []).map(a => a.name) });
              } catch (e) {
                agencies.push({ name: entry.name, description: '', agents: [] });
              }
            }
          }
        } catch (e) {
          agencies = [];
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(agencies));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\nTMUX-ORCHESTRATOR DASHBOARD\n\n🌐 Dashboard URL: http://localhost:${PORT}\n\nAPI Endpoints:\n  GET /api/stats    - System statistics\n  GET /api/panels   - Tmux panel status\n  GET /api/agencies - Available agencies\n\nPress Ctrl+C to stop the server\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down dashboard server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
          let agencies = [];

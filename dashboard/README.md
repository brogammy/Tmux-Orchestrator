# Dashboard (Tmux-Orchestrator)

This folder contains a simple dashboard UI for Tmux-Orchestrator.

Files:
- `index.html` - Static SPA for the dashboard UI (uses mock data by default).
- `server.js` - Small HTTP server that serves `index.html` and provides a few mock API endpoints (`/api/stats`, `/api/panels`, `/api/agencies`).
- `dashboard.log` - (optional) runtime log file.

Quick start

1. Install project dependencies (from repository root):

```bash
npm install
```

2. Start the dashboard server (from repository root):

```bash
npm run start:dashboard
```

The dashboard will be available at http://localhost:3000 by default. You can change the port by setting `DASHBOARD_PORT`.

Integration notes

- The current server returns mocked data. To wire it to the running system, update the API handlers in `server.js` to query the Orchestrator (Node) or the MCP Python server and return real data.

- `server.js` is implemented in CommonJS so it runs with the repository's default `node` invocation. If you prefer ESM, either rename files to `.mjs` or add `"type": "module"` to `package.json` and normalize imports across the repo.

Suggested next steps

- Replace mocked endpoints with real data sources (Orchestrator APIs or MCP RPC).
- Add WebSocket or Server-Sent Events for real-time updates from the Orchestrator.
- Add authentication and access control if exposing the dashboard on a network.
- Add a lightweight test to ensure endpoints return valid JSON.


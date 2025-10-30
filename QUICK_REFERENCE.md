# Quick Reference - Multi-Agency System

## 🎯 One-Pagers for Common Tasks

---

## View What's Running

```bash
# List all tmux sessions
tmux ls

# See CodeAgency windows
tmux list-windows -t CodeAgency

# Peek at coordinator (no attach needed)
tmux capture-pane -t CodeAgency:0 -p | tail -30

# Check active agencies
cat registry/active_agencies.json | jq '.agencies[].name'
```

---

## Interact with CodeAgency

```bash
# Attach and view
tmux attach -t CodeAgency

# Navigate windows inside tmux:
# Ctrl+b then 0-5 (window numbers)
# Ctrl+b then d (detach)

# Send message to coordinator (from outside tmux)
./send-claude-message.sh CodeAgency:0 "Your message here"

# Check what coordinator is doing
tmux capture-pane -t CodeAgency:0 -p | tail -50
```

---

## Give CodeAgency a Task

```bash
./send-claude-message.sh CodeAgency:0 "
TASK: Build a simple FastAPI hello world
- Create in /tmp/hello-api/
- Endpoint: GET /hello returns {'message': 'Hello World'}
- Include requirements.txt and test
- Use your python-agent for this
Break it down and execute.
"
```

---

## Create More Agencies

```bash
# QA Agency
./scripts/create_agency.sh QAAgency \
  --agents test-lead,qa-engineer \
  --capabilities testing,qa

# DevOps Agency
./scripts/create_agency.sh DevOpsAgency \
  --agents cicd-engineer,ops-monitor \
  --capabilities deployment,monitoring

# Security Agency
./scripts/create_agency.sh SecurityAgency \
  --agents security-auditor,vuln-scanner \
  --capabilities security,compliance
```

---

## Communication Between Agencies

```bash
# Inter-agency message
./scripts/send-inter-agency.sh CodeAgency QAAgency \
  '{"type":"handoff","task":"Test the hello API","branch":"main"}'

# Broadcast to all
./scripts/broadcast-agency.sh MetaOrchestrator \
  '{"type":"alert","message":"Production deploy in 1 hour"}'

# Within agency (coordinator to agent)
./scripts/send-agency-message.sh CodeAgency python-agent \
  "TASK-001: Implement authentication module"
```

---

## Message Bus Operations

```bash
# Check pending messages
python3 tools/message_bus.py pending CodeAgency

# View all messages
python3 tools/message_bus.py get CodeAgency

# Send message via bus
python3 tools/message_bus.py send \
  MetaOrchestrator CodeAgency handoff \
  '{"task":"Build API","priority":"high"}' high

# Show message details
python3 tools/message_bus.py show msg-20251028-234131-6c4c5a
```

---

## Useful Checks

```bash
# See agency directory structure
ls -la agencies/CodeAgency/

# Check agency metadata
cat agencies/CodeAgency/agency.json | jq

# View activity log
tail -f agencies/CodeAgency/logs/activity.log

# Check message queue
cat registry/message_queue.json | jq

# Check registry
cat registry/active_agencies.json | jq
```

---

## Troubleshooting

```bash
# Coordinator stuck? Check what it's doing
tmux capture-pane -t CodeAgency:0 -p | tail -100

# Restart coordinator
tmux kill-window -t CodeAgency:0
tmux new-window -t CodeAgency:0 -n coordinator \
  -c /home/sauly/dev/Tmux-Orchestrator/agencies/CodeAgency
tmux send-keys -t CodeAgency:0 'claude' Enter
sleep 5
./send-claude-message.sh CodeAgency:0 \
  "$(cat agencies/CodeAgency/coordinator.md)"

# Check if tmux session exists
tmux has-session -t CodeAgency 2>/dev/null && echo "Exists" || echo "Not found"

# Kill and recreate agency
tmux kill-session -t CodeAgency
./scripts/create_agency.sh CodeAgency \
  --agents python-agent,js-agent,code-reviewer \
  --capabilities backend,frontend,api-design,code-review
```

---

## File Locations

```
/home/sauly/dev/Tmux-Orchestrator/
├── agencies/CodeAgency/         # Agency directory
├── registry/                    # Message queue, active agencies
├── scripts/                     # Core scripts
├── tools/message_bus.py         # Message bus
├── CURRENT_STATE.md             # Detailed state
├── AGENCY_ARCHITECTURE.md       # Architecture docs
└── QUICK_REFERENCE.md           # This file
```

---

## Example: Complete Workflow

```bash
# 1. Check what's running
tmux ls

# 2. Peek at coordinator
tmux capture-pane -t CodeAgency:0 -p | tail -30

# 3. Send a task
./send-claude-message.sh CodeAgency:0 "
Build a simple calculator API:
- POST /calculate with {op, a, b}
- Supports: add, subtract, multiply, divide
- Return {result: number}
Use python-agent.
"

# 4. Watch progress (attach to view)
tmux attach -t CodeAgency

# 5. Check if python-agent started
tmux capture-pane -t CodeAgency:1 -p | tail -20

# 6. Check logs
tail -f agencies/CodeAgency/logs/activity.log
```

---

## Current Session: CodeAgency

**Session**: CodeAgency
**Windows**:
- 0: coordinator (Claude running, operational)
- 1: python-agent (ready)
- 2: js-agent (ready)
- 3: code-reviewer (ready)
- 4: tools (empty)
- 5: sandbox (empty)

**Status**: ✅ Operational, waiting for tasks

---

## Tips

- **Approve permissions**: When coordinator asks, use "2" to approve for session
- **Be explicit**: Give clear, step-by-step instructions
- **Check state first**: Always peek before sending commands
- **Use logs**: Activity logs show everything that happened
- **Start simple**: Test with one task before complex workflows

---

**Need more detail?** See `CURRENT_STATE.md`
**Need architecture?** See `AGENCY_ARCHITECTURE.md`

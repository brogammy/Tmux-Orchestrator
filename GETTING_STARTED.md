# Getting Started with Tmux-Orchestrator

**Agent-Agnostic Multi-Agency System with OpenCode Integration**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER (GUI)                           │
│                     Text / Voice Input                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  chatAgent   │  (Main Entry Point)
                  │ Agent-Agnostic│  Voice & Text Support
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Orchestrator │  (Routes Directives)
                  └──────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │Building │    │ WebDev  │    │ Backend │
   │ Agency  │    │ Agency  │    │ Agency  │
   └────┬────┘    └────┬────┘    └────┬────┘
        │              │              │
        ▼              ▼              ▼
   Project         Project        Project
   Manager         Manager        Manager
        │              │              │
        └──────┬───────┴──────┬───────┘
               │              │
         ┌─────┴─────┐  ┌─────┴─────┐
         ▼           ▼  ▼           ▼
     CodeAgent   CodeValidator  ...
     (tmux       (tmux panel)
      panel)
```

---

## Quick Start

### 1. Prerequisites

```bash
# Ensure OpenCode is running
# Visit: http://localhost:4096

# Install dependencies
npm install

# Optional: Voice support
# macOS: brew install whisper-cpp sox
# Linux: apt-get install whisper.cpp sox
```

### 2. Start the Chat Agent

```bash
# Interactive mode with voice support
node chatAgent.js

# Or use specific directive
node chatAgent.js "Your directive here"
```

### 3. Deploy an Agency to Tmux

```bash
# Deploy BuildingAgency to tmux panels
./deploy-agency.sh BuildingAgency

# Attach to see the panels
tmux attach -t Agency-BuildingAgency
```

---

## Using the System

### Text Input

When you run `node chatAgent.js`, you'll see:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    TMUX ORCHESTRATOR CHAT AGENT                              ║
║               OpenCode Integration with Free/Paid Models                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

📝 Type your orchestrator directives below.
💡 Example: "You are the Orchestrator. Set up project managers for:
            1. Frontend (React) - Build dashboard
            2. Backend (FastAPI) - Create REST API
            Schedule yourself to check in every hour."

🎤 Voice input enabled! Type "voice" to use microphone

Commands: exit, list, stats, history, voice

👤 YOU:
```

### Example Directives

#### Simple Task
```
You are the Orchestrator. Set up project managers for:
1. Backend (Python) - Create a hello world function
Schedule yourself to check in when complete.
```

#### Multi-Domain Task
```
You are the Orchestrator. Set up project managers for:
1. Frontend (React) - Build user dashboard with charts
2. Backend (FastAPI) - Create REST API for user data
3. Database (PostgreSQL) - Design user schema
Schedule yourself to check in every 2 hours.
```

#### Complex Project
```
You are the Orchestrator. Set up project managers for:
1. Frontend (React + TypeScript) - E-commerce product catalog
2. Backend (Node.js) - Payment processing API
3. Database (MongoDB) - Product and order schemas
4. Security (OAuth2) - User authentication system
Schedule yourself to check in every 4 hours.
```

---

## Voice Input

### Enable Voice

Voice is automatically enabled if whisper.cpp and sox are installed.

### Use Voice

1. In interactive mode, type: `voice`
2. Speak your directive when prompted (5 seconds)
3. The system transcribes and processes your speech

Example:
```
👤 YOU: voice

🎤 Voice input mode - starting recording...
🎤 Recording for 5 seconds... SPEAK NOW!
✅ Recording complete
🔄 Transcribing audio...
✅ Transcribed: "You are the Orchestrator. Set up project managers for frontend React build dashboard"

[Processing...]
```

---

## Tmux Panel Deployment

### Deploy an Agency

```bash
./deploy-agency.sh BuildingAgency
```

This creates a tmux session with:
- **Panel 0**: Project Manager
- **Panel 1**: CodeAgent
- **Panel 2**: CodeValidator
- (Additional panels for more agents)

### View Deployed Agency

```bash
# Attach to session
tmux attach -t Agency-BuildingAgency

# List all panels
tmux list-panes -t Agency-BuildingAgency

# Detach (Ctrl-B, then D)
```

### Panel Communication

Each agent runs in its own panel and communicates with the Project Manager through the OpenCode integration.

```
Panel 0 (PM) ←→ Panel 1 (CodeAgent)
             ←→ Panel 2 (CodeValidator)
```

---

## Available Commands

### In Chat Agent

| Command | Description |
|---------|-------------|
| `list` | Show all available agencies |
| `stats` | Show system statistics |
| `history` | Show conversation history |
| `voice` | Use microphone input (if enabled) |
| `exit` or `quit` | Close chat agent |

### CLI Usage

```bash
# List agencies
node chatAgent.js list

# Process directive from command line
node chatAgent.js "You are the Orchestrator..."

# Start interactive mode
node chatAgent.js
```

---

## Model Selection

The system automatically selects optimal models for each task:

### Free Models (tier: "free")
- **qwen-coder**: General code implementation
- **deepseek-coder**: Architecture and patterns
- **llama-coder**: Code generation
- **mistral-nemo**: Analysis and reasoning
- **phi-3**: Fast responses, validation

### Paid Models (tier: "paid")
- **claude-sonnet**: Complex implementations
- **claude-haiku**: Fast premium responses

### Automatic Selection

```
Simple task → qwen-coder (free)
Complex security → claude-sonnet (paid)
Quick validation → phi-3 (free)
```

### Automatic Fallback

```
claude-sonnet (paid) → Rate Limited
     ↓
deepseek-coder (free) → SUCCESS ✓
```

---

## Example Session

```bash
$ node chatAgent.js

🤖 Chat Agent initializing...
🚀 Initializing Orchestrator...
✅ Loaded agency: BuildingAgency
✅ Orchestrator initialized with 1 agencies
✅ Chat Agent ready!
🎤 Voice input enabled!

👤 YOU: You are the Orchestrator. Set up project managers for: 1. Backend (Python) - Create authentication system. Schedule yourself to check in in 1 hour.

📨 Orchestrator received directive:
"You are the Orchestrator. Set up project managers for: 1. Backend (Python) - Create authentication system..."

📋 Processing: 1. Backend (Python) - Create authentication system
🎯 Routing to: BuildingAgency
📥 [ProjectManager] Received prompt: Create authentication system
🤖 [ProjectManager] Selected claude-sonnet (paid) for CodeAgent task
📥 [CodeAgent] Received task: Create authentication system
🤖 [CodeAgent] Using task-optimized model: claude-sonnet
✅ [CodeAgent] Implementation complete using claude-sonnet (paid)
✅ [ProjectManager] Delegating to CodeValidator...
🤖 [ProjectManager] Selected phi-3 (free) for CodeValidator task
✅ [CodeValidator] Result: PASSED using phi-3 (free)

================================================================================
📊 RESULTS
================================================================================

✅ 1. Backend (Python) - Create authentication system
   Agency: BuildingAgency
   Status: Completed
   Models used:
     - CodeAgent: claude-sonnet (paid)
     - CodeValidator: phi-3 (free)

================================================================================

👤 YOU: stats

📊 Statistics: {
  "totalAgencies": 1,
  "totalDirectives": 1,
  "totalTasks": 1,
  "completedTasks": 1,
  "successRate": "100.00%"
}

👤 YOU: exit

👋 Closing Chat Agent...
✅ Chat Agent closed
```

---

## Environment Variables

```bash
# OpenCode server URL
export OPENCODE_URL="http://localhost:4096"

# Prefer free models when possible
export PREFER_FREE_MODELS="true"

# Enable automatic fallback
export FALLBACK_ENABLED="true"
```

---

## Troubleshooting

### OpenCode Not Running

```bash
# Check if accessible
curl http://localhost:4096

# Start OpenCode
opencode server start
```

### Voice Not Working

```bash
# Install whisper.cpp
# macOS:
brew install whisper-cpp sox

# Linux:
apt-get install whisper.cpp sox

# Test recording
rec test.wav trim 0 3
whisper test.wav
```

### Agency Not Loading

```bash
# Check agency exists
ls Agencies/

# Verify config
cat Agencies/BuildingAgency/agency.json

# Check for errors
node chatAgent.js list
```

---

## Next Steps

1. ✅ Chat Agent with voice support
2. ✅ Orchestrator routing directives
3. ✅ Project Managers managing agents
4. ✅ Tmux panel deployment
5. ⏳ Dashboard showing panel map and communication pathways
6. ⏳ Inter-agency communication
7. ⏳ Scheduled check-ins

---

**Version**: 2.0
**Status**: Production Ready
**Last Updated**: 2025-10-29

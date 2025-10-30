# Tmux-Orchestrator with OpenCode

**Agent-Agnostic Multi-Agency System with Voice Control & Dashboard**

> Complete rewrite using OpenCode with (free)/(paid) model tagging. chatAgent provides voice control, Project Managers dynamically select optimal models per task, tmux panel deployment, and real-time dashboard visualization.

---

## Quick Start

```bash
# Install dependencies
npm install

# Ensure OpenCode is running
# Visit: http://localhost:4096

# Start dashboard (runs on http://localhost:3000)
node dashboard/server.js

# Start chat agent (main entry point)
node chatAgent.js
```

---

## System Architecture

```
USER (GUI - Text/Voice)
   ↓
chatAgent (agent-agnostic, outside agencies)
   ↓
Orchestrator (routes directives to agencies)
   ↓
Project Managers (one per agency, selects models per task)
   ↓
Agents (one per tmux panel, executes with assigned models)
```

### Key Concepts

- **chatAgent**: Main entry point, agent-agnostic interface with voice/text input
- **Orchestrator**: Routes directives to appropriate agencies (no "apex" prefix)
- **Agencies**: Contain a Project Manager and specialized agents
- **Project Manager**: Analyzes tasks and selects optimal models per task
- **Agents**: Execute tasks in tmux panels using free or paid models
- **Models**: Tagged as `(free)` or `(paid)` for cost transparency
- **Automatic Fallback**: Uses free models when paid models hit rate limits
- **Dashboard**: Real-time visualization of tmux panels and communication pathways
- **Voice Control**: Optional microphone input via whisper.cpp

---

## Orchestrator Directives

All interactions with the system use **orchestrator directives** - clear instructions that tell the orchestrator what to set up and manage.

### Directive Format

```
"You are the Orchestrator. Set up project managers for:
1. [Domain] ([Technology]) - [Specific Task]
2. [Domain] ([Technology]) - [Specific Task]
Schedule yourself to check in every [interval]."
```

### Example Directives

#### Example 1: Web Application Development

```
"You are the Orchestrator. Set up project managers for:
1. Frontend (React app) - Add dashboard charts with real-time data
2. Backend (FastAPI) - Optimize database queries and add caching
3. Database (PostgreSQL) - Design user analytics schema
Schedule yourself to check in every 2 hours."
```

**What happens:**
- chatAgent receives directive (text or voice)
- Orchestrator routes to appropriate agencies
- BuildingAgency PM selects models per task based on complexity
- Agents execute in tmux panels
- Results displayed in chatAgent and dashboard

#### Example 2: API Development

```
"You are the Orchestrator. Set up project managers for:
1. Backend (Node.js) - Build REST API for user management
2. Security (OAuth2) - Implement authentication system
3. Testing (Jest) - Write comprehensive test suite
Schedule yourself to check in every hour."
```

**What happens:**
- Routes to **BackendAgency**
- PM delegates to BackendAgent (paid: claude-sonnet for complex auth)
- SecurityAgent handles OAuth2 implementation
- CodeValidator runs tests (free: phi-3)

#### Example 3: Simple Tasks with Free Models

```
"You are the Orchestrator. Set up project managers for:
1. Backend (Python) - Fix bug in user login function
2. Frontend (React) - Update button styling
Schedule yourself to check in when complete."
```

**What happens:**
- Simple tasks → PM selects free models
- Backend bug fix → qwen-coder (free)
- Frontend styling → llama-coder (free)
- Cost-effective execution

#### Example 4: Complex Architecture

```
"You are the Orchestrator. Set up project managers for:
1. Backend (Microservices) - Design service architecture
2. Backend (API Gateway) - Implement routing and auth
3. Database (MongoDB) - Design data models with sharding
4. DevOps (Docker/K8s) - Create deployment configs
Schedule yourself to check in every 4 hours."
```

**What happens:**
- Complex tasks → PM selects paid models (Claude)
- Multiple specialized agencies coordinate
- Architecture design uses advanced reasoning
- Check-ins every 4 hours for progress

---

## Model Selection Strategy

The Project Manager automatically selects models based on:

### Task Complexity

- **Simple** (bug fixes, styling): Free models (qwen-coder, phi-3)
- **Medium** (features, refactoring): Free/paid based on specifics
- **Complex** (architecture, security): Paid models (claude-sonnet)

### Task Type

- **Fast validation**: phi-3 (free)
- **Code implementation**: qwen-coder or claude-sonnet
- **Architecture/planning**: claude-sonnet (paid)
- **Code review**: mistral-nemo (free) or claude-haiku (paid)

### Cost Preferences

```bash
# Prefer free models whenever possible
export PREFER_FREE_MODELS="true"

# Use best model regardless of cost
export PREFER_FREE_MODELS="false"
```

### Automatic Fallback

```
Task: "Build authentication system"
PM selects: claude-sonnet (paid)
↓
Claude rate limited (429)
↓
Auto-fallback: deepseek-coder (free)
↓
Task completes successfully ✓
```

---

## Available Models

### Free Models (tier: "free")

| Model | Specialization | Best For |
|-------|---------------|----------|
| **qwen-coder** | Coding | General code implementation |
| **deepseek-coder** | Architecture | Design patterns, structure |
| **llama-coder** | Generation | Code completion, boilerplate |
| **mistral-nemo** | Reasoning | Analysis, planning |
| **phi-3** | Fast responses | Quick validation, simple tasks |

### Paid Models (tier: "paid")

| Model | Specialization | Best For |
|-------|---------------|----------|
| **claude-sonnet** | Advanced coding | Complex implementation, security |
| **claude-haiku** | Fast premium | Quick but high-quality responses |

---

## Available Agencies

### 1. BuildingAgency (General Purpose)

- **Purpose**: General software development
- **Agents**: CodeAgent, CodeValidator
- **Capabilities**: Coding, validation, debugging, refactoring
- **Keywords**: build, code, implement, create, develop

**Example directive:**
```
"You are the Orchestrator. Set up project managers for:
1. General (Python) - Implement data processing pipeline
Schedule yourself to check in when complete."
```

### 2. WebDevAgency

- **Purpose**: Full-stack web development
- **Agents**: FrontendAgent, BackendAgent, DatabaseAgent, CodeValidator
- **Capabilities**: Frontend, backend, database, fullstack
- **Keywords**: web, frontend, backend, react, api, ui, ux

**Example directive:**
```
"You are the Orchestrator. Set up project managers for:
1. Frontend (React) - Build user dashboard
2. Backend (Express) - Create REST API
3. Database (MongoDB) - Design user schema
Schedule yourself to check in every 3 hours."
```

### 3. BackendAgency

- **Purpose**: Backend services and APIs
- **Agents**: APIDesigner, BackendAgent, DatabaseAgent, SecurityAgent, CodeValidator
- **Capabilities**: APIs, microservices, authentication, database, security
- **Keywords**: backend, api, rest, graphql, authentication, database

**Example directive:**
```
"You are the Orchestrator. Set up project managers for:
1. Backend (FastAPI) - Implement user service
2. Security (JWT) - Add authentication
3. Database (PostgreSQL) - Optimize queries
Schedule yourself to check in every 2 hours."
```

---

## Creating Custom Agencies

### Step 1: Create Agency Configuration

Create `examples/my-agency.json`:

```json
{
  "name": "MyAgency",
  "description": "My specialized agency",
  "purpose": "my specific domain",
  "agents": [
    {
      "name": "Agent1",
      "description": "First agent",
      "type": "Agent1",
      "model": "claude-sonnet",
      "instructions": "Specific instructions..."
    },
    {
      "name": "Agent2",
      "description": "Second agent",
      "type": "Agent2",
      "model": "qwen-coder",
      "instructions": "Specific instructions..."
    }
  ],
  "capabilities": ["capability1", "capability2"],
  "keywords": ["keyword1", "keyword2"]
}
```

### Step 2: Generate Agency

```bash
node scripts/create-agency.js create examples/my-agency.json
```

### Step 3: Use in Directives

```
"You are the Orchestrator. Set up project managers for:
1. MyDomain (Technology) - Specific task
Schedule yourself to check in every hour."
```

---

## CLI Commands

### chatAgent (Main Entry Point)

```bash
# Start interactive mode with voice support
node chatAgent.js

# Process directive from command line
node chatAgent.js "You are the Orchestrator. Set up project managers for: ..."

# Available commands in interactive mode:
# - list: Show all available agencies
# - stats: Show system statistics
# - history: Show conversation history
# - plan: Switch to PLAN MODE (analyze without execution)
# - build: Switch to BUILD MODE (execute tasks)
# - voice: Use microphone input (if whisper.cpp installed)
# - exit/quit: Close chat agent
```

### Tmux Deployment

```bash
# Deploy agency to tmux panels (one agent per panel)
./deploy-agency.sh BuildingAgency

# Attach to agency session
tmux attach -t Agency-BuildingAgency

# List all tmux sessions
tmux ls
```

### Dashboard

```bash
# Start dashboard server (http://localhost:3000)
node dashboard/server.js

# Dashboard shows:
# - Tmux panel map with all agents
# - Communication pathways
# - Real-time statistics
# - Model usage (free/paid)
```

### Agent Creator

```bash
# Create new agent interactively
node create-agent.js

# Shows available models with (free)/(paid) tags
# Prompts for agent configuration
# Generates agent file and updates agency.json
```

---

## Environment Configuration

### Required

```bash
# OpenCode server URL
export OPENCODE_URL="http://localhost:4096"
```

### Optional

```bash
# Model preferences
export PREFER_FREE_MODELS="true"    # Default: use free models when possible
export PREFER_FREE_MODELS="false"   # Use best model regardless of cost

# Fallback behavior
export FALLBACK_ENABLED="true"      # Enable automatic fallback (default)
export FALLBACK_ENABLED="false"     # Disable fallback, fail on rate limit
```

---

## Example Usage Workflow

### Scenario: Build a Complete Web Application

**Directive:**
```
"You are the Orchestrator. Set up project managers for:
1. Frontend (React + TypeScript) - User dashboard with authentication
2. Backend (Node.js + Express) - REST API with JWT auth
3. Database (PostgreSQL) - User and session schemas
4. Testing (Jest + Cypress) - Unit and E2E tests
Schedule yourself to check in every 3 hours."
```

**Execution Flow:**

1. **chatAgent** receives directive (text or voice)
2. **Orchestrator** routes to appropriate agency
3. **Project Manager** analyzes tasks and selects optimal models:
   - Frontend: Complex UI → claude-sonnet (paid)
   - Backend: Auth implementation → claude-sonnet (paid)
   - Database: Schema design → qwen-coder (free)
   - Testing: Test generation → phi-3 (free)
4. **Agents execute** in tmux panels with assigned models
5. **Results returned** to chatAgent with model usage details:
   ```json
   {
     "modelSelections": [
       {"agent": "FrontendAgent", "model": "claude-sonnet", "tier": "paid"},
       {"agent": "BackendAgent", "model": "claude-sonnet", "tier": "paid"},
       {"agent": "DatabaseAgent", "model": "qwen-coder", "tier": "free"},
       {"agent": "CodeValidator", "model": "phi-3", "tier": "free"}
     ]
   }
   ```
6. **Check-in scheduled** for 3 hours
7. **Dashboard** updates in real-time showing panel activity

---

## Cost Optimization

### Automatic Optimization

The system automatically optimizes costs:

- **Simple tasks** → Free models (qwen, phi-3, mistral)
- **Complex tasks** → Paid models only when necessary
- **Rate limit fallback** → Free models as backup
- **Transparent tagging** → See `(free)` or `(paid)` in logs

### Manual Optimization

```bash
# Force free models for budget constraints
export PREFER_FREE_MODELS="true"

# Let PM decide based on complexity (recommended)
export PREFER_FREE_MODELS="false"
```

### Cost Tracking

```bash
# Check which models were used (in chatAgent interactive mode)
stats

# Or from command line
node chatAgent.js stats

# Output includes:
# - Total tasks
# - Free model usage
# - Paid model usage
# - Fallback rate
# - Agency statistics
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    USER (GUI)                                │
│             Text Input / Voice Input (mic)                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │     chatAgent        │
              │  (agent-agnostic)    │
              │  Main Entry Point    │
              │  Plan/Build Modes    │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │    Orchestrator      │
              │  (Routes Directives) │
              └──────────┬───────────┘
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
   ┌─────────────────────────────────────┐
   │       Project Manager (PM)          │
   │  - Analyzes task complexity         │
   │  - Selects optimal model per task   │
   │  - Coordinates agent execution      │
   └──────────────┬──────────────────────┘
                  │
         ┌────────┼────────┐
         │        │        │
         ▼        ▼        ▼
     ┌──────┐ ┌──────┐ ┌──────┐
     │Agent1│ │Agent2│ │Agent3│
     │tmux  │ │tmux  │ │tmux  │
     │panel │ │panel │ │panel │
     │(free)│ │(paid)│ │(free)│
     └──────┘ └──────┘ └──────┘
         │        │        │
         └────────┼────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  OpenCode Models │
        │  - Free models   │
        │  - Paid models   │
        │  - Auto fallback │
        └──────────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │    Dashboard     │
        │ localhost:3000   │
        │  - Panel map     │
        │  - Real-time UI  │
        └──────────────────┘
```

---

## Troubleshooting

### OpenCode Not Running

```bash
# Check if OpenCode is accessible
curl http://localhost:4096

# If not running, start OpenCode server
opencode server start
```

### Rate Limit Errors

If you see rate limit errors even with fallback:

```bash
# Ensure fallback is enabled
export FALLBACK_ENABLED="true"

# Prefer free models
export PREFER_FREE_MODELS="true"
```

### Agent Not Found

```bash
# List available agencies (in chatAgent)
list

# Or from command line
node orchestrator.js list

# Verify agency exists
ls Agencies/

# Regenerate if needed (if using agency generator)
node scripts/create-agency.js create examples/your-agency.json
```

---

## Documentation

- **OPENCODE_ARCHITECTURE.md**: Detailed technical architecture
- **config/agent-config.json**: Model definitions and configurations
- **examples/**: Example agency configurations

---

## Benefits Summary

✅ **Cost-Effective**: Free models for simple tasks
✅ **Resilient**: Automatic fallback on rate limits
✅ **Transparent**: Clear `(free)`/`(paid)` tags
✅ **Optimized**: Task-specific model selection
✅ **Scalable**: Multiple agencies in parallel
✅ **Flexible**: Easy to add models and agencies
✅ **Directive-Based**: Clear, natural language instructions

---

## Next Steps

1. ✅ Core system with OpenCode integration
2. ✅ Dynamic model selection
3. ✅ Multiple agencies (Building, WebDev, Backend)
4. ⏳ Tmux panel deployment
5. ⏳ Frontend dashboard
6. ⏳ Scheduled check-ins
7. ⏳ Inter-agency communication

---

**Repository**: https://github.com/Jedward23/Tmux-Orchestrator
**Version**: 2.0 (OpenCode Integration)
**Last Updated**: 2025-10-29
**Status**: Production Ready

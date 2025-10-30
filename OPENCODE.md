# OPENCODE.md

This file provides guidance to using paid providers and OpenCode when working with code in this repository.

## Project Overview

**Tmux-Orchestrator with OpenCode** is a multi-agency autonomous AI system that uses intelligent model selection to orchestrate specialized AI agents for complex software development tasks. The system automatically chooses between free and paid models based on task complexity, cost preferences, and rate limits.

### Core Innovation

**Project Manager Pattern**: Each agency has a dedicated Project Manager that:
- Analyzes task complexity and requirements
- Selects optimal models per task (free vs paid)
- Coordinates sub-agent execution
- Handles automatic fallback when rate limits occur
- Returns execution metadata with cost tracking

## Architecture at a Glance

```
User Input (Text/Voice via chatAgent)
  ↓
Orchestrator (discovers and routes to appropriate agencies)
  ↓
Agencies (BuildingAgency, WebDevAgency, BackendAgency, etc.)
  ├─ Project Manager (analyzes tasks, selects models)
  └─ Specialized Agents (execute in tmux panels)
  ↓
OpenCode Models (free: Qwen, DeepSeek, Llama; paid: Opencode)
  ↓
Results + Cost Tracking + Auto-Fallback
```

### Key Files and Their Roles

| File | Purpose |
|------|---------|
| **chatAgent.js** | Main entry point; handles text/voice input, plan/build modes, interactive commands |
| **orchestrator.js** | Routes directives to agencies, manages execution flow |
| **Agencies/** | Contains specialized agencies (BuildingAgency, WebDevAgency, BackendAgency) |
| **Agencies/*/ProjectManager.js** | Agency-specific task analyzer and model selector |
| **lib/OpenCodeAgent.js** | Wrapper for OpenCode integration with model selection + fallback logic |
| **config/agent-config.json** | Comprehensive model registry with capabilities, costs, rate limits |
| **dashboard/server.js** | Real-time dashboard visualization (port 3000) |
| **opencode.json** | OpenCode provider configuration (models, tools, MCP server) |

## Essential Development Commands

### Starting the System

```bash
# Install dependencies
npm install

# Ensure OpenCode is running
opencode server start  # or docker-compose up opencode

# Start dashboard (optional but recommended)
node dashboard/server.js &

# Start main chat agent
node chatAgent.js
```

### Core Operations

```bash
# Run chatAgent in interactive mode
node chatAgent.js

# Send a directive from command line
node chatAgent.js "You are the Orchestrator. Set up project managers for: ..."

# Interactive mode commands:
# - list: Show agencies
# - stats: Show cost/model statistics
# - history: Show conversation history
# - plan: Switch to PLAN MODE (analyze without execution)
# - build: Switch to BUILD MODE (execute with full coordination)
# - voice: Enable microphone input
# - exit: Quit

# Deploy agency to tmux panels
./deploy-agency.sh BuildingAgency

# List tmux sessions
tmux ls
```

### Testing and Debugging

```bash
# View tmux session (if deployed)
tmux attach -t Agency-BuildingAgency

# Check recent git history
git log --oneline -10

# View git status
git status
```

## Directive Format and Examples

All interactions use **orchestrator directives** - structured instructions that tell the system what to build:

```
"You are the Orchestrator. Set up project managers for:
1. [Domain] ([Technology]) - [Specific Task]
2. [Domain] ([Technology]) - [Specific Task]
...
Schedule yourself to check in every [interval]."
```

### Example: Web Application

```
"You are the Orchestrator. Set up project managers for:
1. Frontend (React) - Build user dashboard with authentication
2. Backend (Express) - Create REST API with JWT auth
3. Database (PostgreSQL) - Design user and session schemas
Schedule yourself to check in every 3 hours."
```

**What happens:**
- Orchestrator routes to WebDevAgency
- Project Manager analyzes complexity (high for auth → uses opencode-sonnet)
- Agents execute in tmux panels with assigned models
- Results returned with model usage metadata

## Model Selection Strategy

The Project Manager automatically selects models based on:

1. **Task Complexity** (simple → free, complex → paid)
2. **Capabilities** (filtering models with required skills)
3. **Cost Preference** (`PREFER_FREE_MODELS=true/false`)
4. **Rate Limit Status** (auto-fallback if rate limited)

### Free Models (tagged as `(free)`)
- **qwen-coder**: General coding (Ollama/OpenCode)
- **deepseek-coder**: Architecture and design patterns
- **llama-coder**: Code completion and boilerplate
- **mistral-nemo**: Analysis and planning
- **phi-3**: Fast validation and simple tasks

### Paid Models (tagged as `(paid)`)
- **opencode-sonnet**: Complex implementation, security, advanced reasoning
- **opencode-haiku**: Quick high-quality responses

## Environment Configuration

```bash
# Required
export OPENCODE_URL="http://localhost:4096"

# Optional (cost control)
export PREFER_FREE_MODELS="true"    # Use free models when possible
export PREFER_FREE_MODELS="false"   # Use best model regardless of cost

# Optional (fallback behavior)
export FALLBACK_ENABLED="true"      # Enable automatic fallback (default)
export FALLBACK_ENABLED="false"     # Fail on rate limit instead of fallback
```

## Orchestrator Routing

The orchestrator matches directives to agencies using keyword detection:

- **BuildingAgency**: keywords: build, code, implement, create, develop, general
- **WebDevAgency**: keywords: web, frontend, backend, react, api, ui, ux, fullstack
- **BackendAgency**: keywords: backend, api, rest, graphql, authentication, database, microservices

If multiple agencies match, the orchestrator coordinates across them.

## Key Concepts

### Agencies
Self-contained teams with a Project Manager and specialized agents. Each agency:
- Has its own configuration (`agency.json`)
- Contains multiple agents with different roles
- Handles a specific domain (general, web, backend)
- Can be created via `scripts/create-agency.js`

### Project Manager
The decision-making coordinator for an agency that:
- Receives tasks from the Orchestrator
- Analyzes complexity and requirements
- Selects optimal models per task
- Coordinates agent execution
- Manages automatic fallback for rate limits
- Returns results with cost metadata

### Agents
Specialized workers in tmux panels that:
- Execute code and handle specific domains
- Receive their assigned model from the PM
- Report results back to the PM
- Use OpenCodeAgent wrapper for model management

### Model Selection with Fallback

```
Primary Model Selected
  ↓
Execute Task
  ├─ Success → Return result
  └─ Rate Limit Error (429)
    ↓
    Try Fallback Model 1
    ├─ Success → Return result
    └─ Rate Limit Error
      ↓
      Try Fallback Model 2
      ├─ Success → Return result
      └─ Rate Limit Error
        ↓
        Try Fallback Model 3
        ├─ Success → Return result
        └─ All failed → Return error
```
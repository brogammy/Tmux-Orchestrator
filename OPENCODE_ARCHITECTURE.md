# Tmux-Orchestrator with OpenCode Integration

**Complete Multi-Agency System with Free/Paid Model Support**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [Getting Started](#getting-started)
5. [Agency System](#agency-system)
6. [Model Selection](#model-selection)
7. [Usage Examples](#usage-examples)
8. [Creating New Agencies](#creating-new-agencies)
9. [Configuration](#configuration)
10. [Deployment](#deployment)

---

## Overview

The Tmux-Orchestrator is a multi-agency autonomous AI system that uses **OpenCode** to provide both **free** and **paid** AI models. Each agency has its own Project Manager that dynamically selects the optimal model for each task based on complexity, requirements, and cost preferences.

### Core Concept

```
User (GUI - Text/Voice Input)
    ↓
chatAgent (agent-agnostic main entry point)
    ↓
Orchestrator (routes directives to agencies)
    ↓
Project Manager (selects models per task)
    ↓
Agents in tmux panels (execute with optimal models)
    ↓
Results displayed in chatAgent & Dashboard
    ↓
Automatic fallback to free models if needed
```

---

## Architecture

### System Components

```
Tmux-Orchestrator/
├── lib/
│   └── OpenCodeAgent.js          # Agent wrapper with model selection
├── config/
│   └── agent-config.json         # Model definitions (free/paid)
├── dashboard/
│   ├── server.js                 # Dashboard HTTP server
│   └── index.html                # Real-time panel visualization
├── Agencies/
│   ├── BuildingAgency/           # General development
│   │   ├── ProjectManager.js     # Coordinates agents
│   │   ├── CodeAgent.js          # Implements code
│   │   ├── CodeValidator.js      # Validates code
│   │   └── agency.json           # Agency configuration
│   ├── WebDevAgency/             # Web development (if created)
│   └── BackendAgency/            # Backend services (if created)
├── scripts/
│   └── create-agency.js          # Agency generator
├── chatAgent.js                  # Main entry point (agent-agnostic)
├── orchestrator.js               # Routes directives to agencies
├── create-agent.js               # Interactive agent creator
├── deploy-agency.sh              # Deploy agency to tmux panels
├── docker-compose.yml            # Container orchestration
└── execution-environment.html    # Execution visualization
```

### Directive Execution Flow

1. **User** provides directive via chatAgent (text or voice)
2. **chatAgent** processes input (supports Plan Mode or Build Mode)
3. **Orchestrator** receives directive and routes to appropriate agency
4. **Project Manager** analyzes tasks and selects optimal model per task:
   - Task complexity analysis
   - Required capabilities matching
   - Cost preferences consideration
   - Rate limit status checking
5. **Agents execute** in tmux panels with assigned models
6. **Automatic fallback** to free models if paid models are rate-limited
7. **Results** returned to chatAgent and updated on Dashboard

---

## Key Features

### 1. Dynamic Model Selection (free)/(paid) Tags

Each model is tagged as either `(free)` or `(paid)`:

```json
{
  "models": {
    "claude-sonnet": {
      "tier": "paid",
      "provider": "anthropic",
      "capabilities": ["coding", "reasoning", "analysis"]
    },
    "qwen-coder": {
      "tier": "free",
      "provider": "opencode",
      "capabilities": ["coding", "debugging"]
    }
  }
}
```

### 2. Task-Optimized Model Assignment

Project Managers analyze each task and select the best model:

```javascript
// Complex architecture task → Claude Sonnet (paid)
// Simple bug fix → Qwen Coder (free)
// Fast validation → Phi-3 (free)
```

### 3. Automatic Fallback

When Claude hits rate limits:
```
Claude Sonnet (paid) → rate limited
    ↓
Qwen Coder (free) → executes successfully
```

### 4. Multi-Agency Support

Multiple specialized agencies:
- **BuildingAgency**: General development
- **WebDevAgency**: Frontend + Backend + Database
- **BackendAgency**: APIs + Services + Security

---

## Getting Started

### Prerequisites

1. **Node.js** installed
2. **OpenCode** server running (http://localhost:4096)
3. **tmux** installed (for panel deployment)

### Installation

```bash
# Install dependencies
npm install

# Set environment variables
export OPENCODE_URL="http://localhost:4096"
export PREFER_FREE_MODELS="true"  # Optional: prefer free models

# Start dashboard
node dashboard/server.js &

# Start chat agent (main entry point)
node chatAgent.js
```

### Quick Test

```bash
# Interactive mode
node chatAgent.js

# Then type:
list       # List agencies
stats      # Show statistics

# Or use voice (if whisper.cpp installed)
voice      # Record voice directive
```

---

## Agency System

### Each Agency Has:

1. **Project Manager**:
   - Receives directives from Orchestrator (via chatAgent)
   - Analyzes tasks and creates execution plans
   - Selects optimal models for each agent
   - Coordinates agent execution
   - Submits results for approval

2. **Specialized Agents**:
   - Execute specific tasks
   - Support both free and paid models
   - Automatic fallback on rate limits

3. **Configuration** (`agency.json`):
   - Defines capabilities and keywords
   - Lists available agents
   - Specifies model preferences

### Example: BuildingAgency

```javascript
const projectManager = new ProjectManager();
await projectManager.initialize();

// PM receives task
const result = await projectManager.receivePrompt("Build a REST API");

// PM analyzes and delegates:
// 1. CodeAgent (using claude-sonnet for complex implementation)
// 2. CodeValidator (using phi-3 for fast validation)

// Result includes model selections and execution details
```

---

## Model Selection

### Selection Criteria

The Project Manager scores models based on:

1. **Task Complexity**:
   - Complex → Prefer paid models (Claude)
   - Simple → Prefer free models (Qwen, Phi-3)

2. **Capabilities Match**:
   - Coding task → Models with "coding" capability
   - Analysis → Models with "reasoning" capability

3. **Cost Preferences**:
   - `PREFER_FREE_MODELS=true` → Boost free model scores
   - Default → Balance based on task needs

4. **Rate Limit Status**:
   - Paid model rate-limited → Auto-fallback to free

### Model Recommendations

```javascript
// Project Manager recommends model per task
const recommendation = agent.recommendModelForTask(
  "Implement user authentication with JWT",
  { preferFree: process.env.PREFER_FREE_MODELS === 'true' }
);

// Result:
// {
//   recommendedModel: "claude-sonnet",
//   tier: "paid",
//   score: 18,
//   reason: "Complex security implementation"
// }
```

---

## Usage Examples

### Example 1: Orchestrator Directive

```
"You are the Orchestrator. Set up project managers for:
1. Frontend (React app) - Add dashboard charts
2. Backend (FastAPI) - Optimize database queries
Schedule yourself to check in every hour."
```

The system will:
1. Route Frontend task → WebDevAgency → FrontendAgent
2. Route Backend task → BackendAgency → BackendAgent + DatabaseAgent
3. Each PM selects optimal models per subtask
4. Schedule periodic check-ins

### Example 2: Direct Agency Request

```javascript
import ChatAgent from './chatAgent.js';
const chatAgent = new ChatAgent();

await chatAgent.initialize();

await chatAgent.receiveInput(
  "You are the Orchestrator. Set up project managers for: 1. Frontend (React) - Build dashboard with user authentication. Schedule yourself to check in in 1 hour.",
  'text'
);

// Routed to WebDevAgency
// PM delegates to:
//   - FrontendAgent (React UI) → qwen-coder (free)
//   - BackendAgent (Auth API) → claude-sonnet (paid)
//   - CodeValidator (Testing) → phi-3 (free)
```

### Example 3: Model Preference

```bash
# Prefer free models
export PREFER_FREE_MODELS="true"
node chatAgent.js "You are the Orchestrator. Set up project managers for: 1. Backend (Python) - Create a calculator function. Schedule yourself to check in when complete."

# Uses: qwen-coder (free) ✓

# Allow paid models for complex tasks
export PREFER_FREE_MODELS="false"
node chatAgent.js "You are the Orchestrator. Set up project managers for: 1. Backend (Microservices) - Design a microservices architecture. Schedule yourself to check in every 2 hours."

# Uses: claude-sonnet (paid) ✓
```

---

## Creating New Agencies

### Using the Generator

```bash
# Create agency from config
node scripts/create-agency.js create examples/webdev-agency.json

# List all agencies
node scripts/create-agency.js list
```

### Manual Agency Creation

1. **Create agency config** (`my-agency.json`):

```json
{
  "name": "MyAgency",
  "description": "My specialized agency",
  "purpose": "specific domain",
  "agents": [
    {
      "name": "SpecializedAgent",
      "description": "Does specific work",
      "type": "SpecializedAgent",
      "model": "claude-sonnet",
      "instructions": "Specific instructions for this agent"
    }
  ],
  "capabilities": ["capability1", "capability2"],
  "keywords": ["keyword1", "keyword2"]
}
```

2. **Generate agency structure**:

```bash
node scripts/create-agency.js create my-agency.json
```

3. **Agency is ready** in `Agencies/MyAgency/`

---

## Configuration

### Model Configuration (`config/agent-config.json`)

Add new models:

```json
{
  "models": {
    "my-custom-model": {
      "provider": "opencode",
      "model": "my-model:latest",
      "tier": "free",
      "capabilities": ["coding", "analysis"],
      "costPer1kTokens": 0,
      "rateLimit": null
    }
  }
}
```

### Agent Configuration

Each agent can have:

```json
{
  "agentConfigs": {
    "MyAgent": {
      "primaryModel": "claude-sonnet",
      "fallbackModels": ["qwen-coder", "phi-3"],
      "systemPrompt": "You are a specialized agent...",
      "capabilities": ["specialized-task"],
      "allowFallback": true
    }
  }
}
```

### Environment Variables

```bash
# OpenCode server URL
export OPENCODE_URL="http://localhost:4096"

# Model preferences
export PREFER_FREE_MODELS="true"    # Prefer free models when possible
export PREFER_FREE_MODELS="false"   # Use best model regardless of cost

# Fallback behavior
export FALLBACK_ENABLED="true"      # Enable automatic fallback
```

---

## Deployment

### Tmux Panel Deployment

Each agent runs in its own tmux panel with OpenCode:

```bash
# Create tmux session for agency
tmux new-session -s MyAgency -d

# Deploy Project Manager
tmux send-keys -t MyAgency:0 "node Agencies/MyAgency/ProjectManager.js" C-m

# Deploy agents in separate panels
tmux split-window -t MyAgency:0 -h
tmux send-keys -t MyAgency:0.1 "node Agencies/MyAgency/Agent1.js" C-m

tmux split-window -t MyAgency:0 -v
tmux send-keys -t MyAgency:0.2 "node Agencies/MyAgency/Agent2.js" C-m

# Attach to session
tmux attach -t MyAgency
```

### Production Deployment

1. **Start OpenCode server**:
```bash
# Ensure OpenCode is running on port 4096
opencode server start
```

2. **Deploy agencies**:
```bash
# Use deployment script (to be created)
./scripts/deploy-agencies.sh
```

3. **Monitor execution**:
```bash
# Check orchestrator status
node apex-orchestrator.js stats

# View agency details
node apex-orchestrator.js agency BuildingAgency
```

---

## Model Tier Summary

### Free Models (tier: "free")

- **qwen-coder** - Coding specialist
- **deepseek-coder** - Architecture and patterns
- **llama-coder** - Code generation
- **mistral-nemo** - Reasoning and analysis
- **phi-3** - Fast responses

### Paid Models (tier: "paid")

- **claude-sonnet** - Advanced coding and reasoning
- **claude-haiku** - Fast, efficient responses

---

## Benefits of This System

1. **Cost Optimization**: Automatically uses free models when appropriate
2. **Rate Limit Resilience**: Falls back to free models when paid models are limited
3. **Task-Optimized**: Each task gets the best model for its requirements
4. **Transparent**: Clear `(free)`/`(paid)` tags show costs
5. **Flexible**: Easy to add new models and agencies
6. **Scalable**: Multiple agencies can run in parallel

---

## Next Steps

1. Deploy agencies to tmux panels
2. Create more specialized agencies
3. Add inter-agency communication
4. Implement scheduled check-ins
5. Build monitoring dashboard

---

**Last Updated**: 2025-10-29
**Status**: Production Ready
**Version**: 2.0 (OpenCode Integration)

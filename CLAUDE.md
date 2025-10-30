# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
OpenCode Models (free: Qwen, DeepSeek, Llama; paid: Claude)
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
- Project Manager analyzes complexity (high for auth → uses claude-sonnet)
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
- **claude-sonnet**: Complex implementation, security, advanced reasoning
- **claude-haiku**: Quick high-quality responses

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

## Adding a New Model

1. Add to `config/agent-config.json`:
   ```json
   "models": {
     "my-model": {
       "provider": "opencode",
       "tier": "free",
       "capabilities": ["coding", "reasoning"],
       "costPer1kTokens": 0
     }
   }
   ```

2. Update agent configuration to include as fallback:
   ```json
   "fallbackModels": ["my-model", "qwen-coder", ...]
   ```

3. The model is immediately available for selection.

## Creating a Custom Agency

1. Create configuration in `examples/my-agency.json`:
   ```json
   {
     "name": "MyAgency",
     "description": "...",
     "agents": [
       {"name": "Agent1", "type": "...", "model": "..."}
     ],
     "keywords": ["keyword1", "keyword2"]
   }
   ```

2. Generate the agency:
   ```bash
   node scripts/create-agency.js create examples/my-agency.json
   ```

3. Use in directives by including the keywords

## Testing Model Selection

```bash
# Check which models are being used
node chatAgent.js
# In interactive mode, type: stats

# Force free models (for testing cost optimization)
export PREFER_FREE_MODELS="true"
node chatAgent.js "Your directive here..."

# Test fallback behavior
# Use a simple task → forces free model → can test rate limit behavior
```

## Common Development Tasks

### Debugging Model Selection

Edit `ProjectManager.js` in the agency and add logging:
```javascript
console.log(`[PM] Task complexity: ${complexity}`);
console.log(`[PM] Selected model: ${selectedModel}`);
console.log(`[PM] Model tier: ${modelConfig.tier}`);
```

### Adding Agent Capability

1. Update `config/agent-config.json` with new capability
2. Update agent's capabilities array in agency configuration
3. Update ProjectManager selection logic to consider new capability

### Viewing Real-Time Execution

Start the dashboard:
```bash
node dashboard/server.js
# Visit http://localhost:3000
```

Shows:
- Tmux panel layout with all agents
- Real-time execution status
- Model usage (free vs paid)
- Communication pathways

## Important Architecture Decisions

1. **Agent-Agnostic Entry Point**: chatAgent.js is outside any agency for universal model selection
2. **Project Manager Pattern**: Decouples task analysis from execution, enabling smart model selection
3. **Automatic Fallback**: Built into OpenCodeAgent wrapper - agents don't need to handle it
4. **Cost Transparency**: Every model tagged `(free)` or `(paid)` in logs and config
5. **Tmux Deployment**: Agents run in isolated tmux panels for concurrent execution and monitoring
6. **Configuration-Driven**: Models and capabilities defined in JSON, not hardcoded

## Key Implementation Details

### Model Selection Scoring (ProjectManager.selectModel)

1. Initialize baseline scores for all models
2. Adjust for task complexity (simple +50 for free, complex +50 for paid)
3. Apply cost preference multiplier
4. Check rate limit status and available fallbacks
5. Select highest-scoring model with fallback chain

### Fallback Chain Storage

Stored in agent initialization:
```javascript
this.fallbackModels = ["qwen-coder", "deepseek-coder", "llama-coder"];
```

When rate limit occurs, tries in order until one succeeds or list exhausted.

### Cost Tracking

Every agent execution returns:
```json
{
  "model": "claude-sonnet",
  "tier": "paid",
  "tokensUsed": 1234,
  "estimatedCost": 0.00234
}
```

Aggregated in stats command for cost awareness.

## Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| OpenCode not accessible | `curl http://localhost:4096` - if fails, run `opencode server start` |
| Model rate limited repeatedly | Set `PREFER_FREE_MODELS=true` to use free models first |
| Agency not found | List agencies with `list` command in chatAgent |
| Agent not executing | Check agency.json exists and is valid JSON |
| Dashboard not working | Ensure `node dashboard/server.js` is running on port 3000 |
| Wrong model selected | Check `PREFER_FREE_MODELS` env var; check task complexity detection |

## Useful Git Workflows

```bash
# View recent changes
git log --oneline -10

# Check what's changed
git status

# View specific file history
git log -p config/agent-config.json

# See changes since last commit
git diff

# Create a feature branch
git checkout -b feature/your-feature

# Commit with proper message format
git commit -m "feat: Description of changes"
git commit -m "fix: Description of bugfix"
git commit -m "refactor: Description of refactoring"
```

## Performance and Optimization

- **Parallel Agency Execution**: Multiple agencies can run simultaneously
- **Model Reuse**: Once selected, same model used for similar complexity tasks
- **Free Model Preference**: Saves cost without sacrificing quality on simple tasks
- **Rate Limit Fallback**: Prevents task failures while optimizing cost

## References

- **README.md**: Full user documentation and examples
- **config/agent-config.json**: Complete model and capability registry
- **opencode.json**: Provider configuration and tool setup
- **Agencies/*/agency.json**: Agency-specific configuration templates

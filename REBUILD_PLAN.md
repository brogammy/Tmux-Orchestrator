# Rebuild Plan - New Architecture

**Date**: 2025-10-29
**Status**: REPLACING ALL OLD ARCHITECTURE

---

## 🚨 DIRECTIVE: REMOVE ALL OLD DOCUMENTATION

ALL existing documentation is obsolete. Replace with these directives.

---

## 🏗️ NEW ARCHITECTURE

### Core Components

#### 1. Execution Environment Interface
- **Bottom**: Chat window (you ↔ Chat Agent)
- **Left**: Code editor
- **Right**: Execution results (real-time visibility)

#### 2. System Flow
1. **Chat Agent** → talks to Orchestrator
2. **Orchestrator** → routes to local agencies
3. **Project Manager** → creates prompts for its own agency, knowing their capabilities
4. **Project Manager** → delegates prompts to agents in its Agency
5. **CodeAgent** → works in execution environment (live coding)
6. **CodeValidator** → works in execution environment (live testing)
7. **All work happens live** → in execution environment for full visibility
8. **Iterated upon** → if needs adjustment (still in execution environment)
9. **Submitted for initiated approval** → and additional directives
10. **You type** → with Chat Agent, they pass it on
11. **You check it** → as it materializes in front of you (in execution environment)

---

## 🏢 BuildingAgency (FIRST AND ONLY AGENCY)

### Components
- **Project Manager** (creates prompts, delegates to agents)
- CodeAgent (works IN execution environment - live coding)
- CodeValidator (works IN execution environment - live testing)
- execution environment (shared live workspace for all agents)

### DO NOT ADD EVER to first layer
These 4 components are the complete first layer. No additions.

---

## 🔧 Agency Pattern

For future agencies:
- **[AgencyName]Agency** contains **Project Manager**
- **Project Manager** creates prompts and delegates to agents
- Each Project Manager knows its agency's capabilities
- Each Project Manager delegates tasks to its own agents

### Example Pattern
**AnotherAgency**:
- **Project Manager** (creates prompts, delegates to agents)
- [its own agents]
- [its own components]

---

## 📋 RULES

### Naming Conventions
- **localOrchestrator** = not proper prefix, more general (DO NOT USE)
- **Project Manager** = CORRECT term for all agencies
- Each agency has exactly one Project Manager

### Architecture Rules
- Orchestrator ROUTES ONLY, does NOT create prompts
- Project Managers CREATE PROMPTS and DELEGATE to their agents
- CodeAgent and CodeValidator BOTH WORK IN execution environment (not separate)
- tmux will be used AS I DICTATE (controlled usage)
- Full visibility in execution environment
- Real-time observation of all work
- All work happens live in execution environment (shared workspace)

---

## ⏰ UPDATE DIRECTIVE

**UPDATE DOCUMENTATION EVERY 30 MINUTES WHEN WORKING**

This file must be updated every 30 minutes during active development to preserve progress and prevent loss of architectural decisions.

---

## 🗑️ OBSOLETE SYSTEMS TO REMOVE

- ALL tmux-based architecture
- ALL multi-window session management
- ALL current agency creation scripts
- ALL message bus JSON files
- ALL registry systems
- ALL current dashboard systems

---

## 📁 NEW FOLDER STRUCTURE

```
Tmux-Orchestrator/
├── chatAgent/                    # Chat/Voice agent (root level)
├── Agencies/                     # All agencies folder
│   ├── BuildingAgency/          # First agency
│   │   ├── ProjectManager      # Project Manager file
│   │   ├── CodeAgent           # CodeAgent file
│   │   ├── CodeValidator       # CodeValidator file
│   │   └── executionEnvironment # execution environment file
│   └── [FutureAgency]/         # Future agencies follow same pattern
│       ├── ProjectManager      # Project Manager file
│       ├── [Agent1]
│       ├── [Agent2]
│       └── ...
├── orchestrator                 # Routing system
├── REBUILD_PLAN.md              # This file
└── README.md                    # Points to this file
```

## 🎯 IMMEDIATE NEXT STEPS

1. ✅ Remove all old documentation files
2. ✅ Create new file structure based on this architecture
3. ✅ Create chatAgent folder and files
4. ✅ Create Agencies folder structure
5. ✅ Create BuildingAgency with 4 components
6. ✅ Implement orchestrator (routing only)
7. ✅ Create execution environment interface
8. ✅ Create main integration script
9. Rename BuildingOrchestrator to Project Manager
10. Update all references to use "Project Manager"
11. Create execution environment UI (left editor, right results)
12. Update this file every 30 minutes

---

**Last Updated**: 2025-10-29 16:25 UTC
**Status**: Architecture terminology updated - Chat Agent and Orchestrator
**Next Update**: Within 30 minutes of active work
**Progress**: All obsolete documentation and directories removed, folder structure created, all core components implemented, main integration script complete, tmux fully configured, BuildingOrchestrator renamed to Project Manager, execution environment collaboration documented, terminology updated to Chat Agent and Orchestrator
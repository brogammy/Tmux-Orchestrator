#!/bin/bash
# Run this to commit all the multi-agency system work

echo "📦 Committing Multi-Agency System..."

# Configure git if needed
if ! git config user.email > /dev/null 2>&1; then
    echo "⚠️  Git user not configured. Configuring now..."
    read -p "Enter your email: " email
    read -p "Enter your name: " name
    git config user.email "$email"
    git config user.name "$name"
    echo "✓ Git configured"
fi

# Stage all changes
git add -A

# Commit with detailed message
git commit -m "feat: Implement Multi-Agency Autonomous System

Built a complete agency-based infrastructure for autonomous AI collaboration:

## Core Infrastructure
- Agency creation system (create_agency.sh)
- Message bus for inter-agency communication (message_bus.py)
- Registry system tracking active agencies
- Communication scripts (intra-agency, inter-agency, broadcast)

## CodeAgency (Operational)
- Tmux session with coordinator + 3 specialist agents
- Capabilities: backend, frontend, api-design, code-review
- Agents: python-agent, js-agent, code-reviewer
- Status: ✅ Running and tested

## Documentation
- AGENCY_ARCHITECTURE.md: Complete design and philosophy
- CURRENT_STATE.md: Current system state and operational status
- QUICK_REFERENCE.md: Command cheat sheet
- START_HERE.md: Quick start for new sessions
- Updated CLAUDE.md with agency system instructions

## Features
- Agency containerization in tmux sessions
- Persistent message queue and registry
- Structured communication protocols
- Activity logging
- Coordinator-agent hierarchy
- Multi-agency coordination support

## Tested & Working
✅ Agency creation
✅ Coordinator initialization and briefing
✅ Message bus operations
✅ Intra-agency communication
✅ Registry tracking
✅ Activity logging

Ready for autonomous multi-agency collaboration and project execution.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "✅ Committed successfully!"
echo ""
echo "Git status:"
git status

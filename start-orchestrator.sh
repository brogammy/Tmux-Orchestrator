#!/bin/bash
# Quick script to start an orchestrator session

ORCHESTRATOR_DIR="/home/sauly/dev/Tmux-Orchestrator"

# Check if orchestrator session already exists
if tmux has-session -t orchestrator 2>/dev/null; then
    echo "✓ Orchestrator session already exists"
    echo "Attach with: tmux attach -t orchestrator"
    exit 0
fi

echo "🚀 Creating orchestrator session..."

# Create orchestrator session
tmux new-session -d -s orchestrator -c "$ORCHESTRATOR_DIR"

# Start the Tmux Orchestrator MCP Server
tmux send-keys -t orchestrator:0 'python3 /home/sauly/dev/Tmux-Orchestrator/mcp_server_tmux.py' Enter

echo "✓ Orchestrator session created"
echo ""
echo "To attach: tmux attach -t orchestrator"
echo "To send messages: python3 talk.py orchestrator 'Your message here'"
echo "To peek: python3 talk.py peek orchestrator"

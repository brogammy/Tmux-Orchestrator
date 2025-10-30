#!/usr/bin/env bash

# Deploy Agency to Tmux Panels
# Each agent gets its own panel
# Project Manager runs in main panel

AGENCY_NAME=$1

if [ -z "$AGENCY_NAME" ]; then
    echo "Usage: ./deploy-agency.sh <AgencyName>"
    echo "Example: ./deploy-agency.sh BuildingAgency"
    exit 1
fi

AGENCY_PATH="./Agencies/$AGENCY_NAME"
CONFIG_FILE="$AGENCY_PATH/agency.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Agency not found: $AGENCY_NAME"
    exit 1
fi

echo "🚀 Deploying $AGENCY_NAME to tmux..."

# Create or attach to session
SESSION_NAME="Agency-$AGENCY_NAME"

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "⚠️  Session $SESSION_NAME already exists"
    read -p "Kill and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tmux kill-session -t "$SESSION_NAME"
    else
        echo "Aborted"
        exit 1
    fi
fi

# Create new session with Project Manager
echo "📝 Creating session: $SESSION_NAME"
tmux new-session -d -s "$SESSION_NAME" -n "PM"

# Start Project Manager in first panel
echo "🏢 Starting Project Manager..."
tmux send-keys -t "$SESSION_NAME:0.0" "cd $(pwd)" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🏢 Project Manager for $AGENCY_NAME'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Waiting for tasks from Orchestrator...'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "# PM runs within orchestrator process" C-m

# Read agents from config
AGENTS=$(node -e "
const config = require('$CONFIG_FILE');
console.log(config.agents.map(a => a.name).join(' '));
")

PANEL_NUM=1

# Create panel for each agent
for AGENT in $AGENTS; do
    echo "🤖 Creating panel for $AGENT..."

    # Split window
    if [ $PANEL_NUM -eq 1 ]; then
        # First split (horizontal)
        tmux split-window -t "$SESSION_NAME:0" -h
    elif [ $PANEL_NUM -eq 2 ]; then
        # Second split (vertical on right)
        tmux split-window -t "$SESSION_NAME:0.1" -v
    else
        # Additional splits
        tmux split-window -t "$SESSION_NAME:0.$((PANEL_NUM-1))" -v
    fi

    # Navigate to project directory in new panel
    tmux send-keys -t "$SESSION_NAME:0.$PANEL_NUM" "cd $(pwd)" C-m

    # Display agent info
    tmux send-keys -t "$SESSION_NAME:0.$PANEL_NUM" "echo '🤖 $AGENT for $AGENCY_NAME'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$PANEL_NUM" "echo 'Status: Idle, waiting for tasks from PM...'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$PANEL_NUM" "# Agent process managed by PM" C-m

    PANEL_NUM=$((PANEL_NUM + 1))
done

# Balance panels
tmux select-layout -t "$SESSION_NAME:0" tiled

# Select PM panel
tmux select-pane -t "$SESSION_NAME:0.0"

echo ""
echo "✅ $AGENCY_NAME deployed to tmux!"
echo ""
echo "📊 Layout:"
echo "   Panel 0: Project Manager"

PANEL_NUM=1
for AGENT in $AGENTS; do
    echo "   Panel $PANEL_NUM: $AGENT"
    PANEL_NUM=$((PANEL_NUM + 1))
done

echo ""
echo "🔗 Attach to session:"
echo "   tmux attach -t $SESSION_NAME"
echo ""
echo "📋 List panels:"
echo "   tmux list-panes -t $SESSION_NAME"
echo ""
echo "💬 Send message to panel:"
echo "   tmux send-keys -t $SESSION_NAME:0.1 'message' C-m"
echo ""

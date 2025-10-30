#!/bin/bash
# Send message to agent within an agency (intra-agency communication)
# Usage: send-agency-message.sh <agency> <target_agent> <message>

if [ $# -lt 3 ]; then
    echo "Usage: $0 <agency> <target_agent> <message>"
    echo ""
    echo "Examples:"
    echo "  $0 CodeAgency python-agent 'TASK-001: Implement user auth'"
    echo "  $0 CodeAgency coordinator 'STATUS: Auth module 60% complete'"
    echo "  $0 QAAgency test-lead 'QUESTION: Which test framework to use?'"
    exit 1
fi

AGENCY="$1"
TARGET="$2"
shift 2
MESSAGE="$*"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Verify agency exists
REGISTRY_FILE="$PROJECT_ROOT/registry/active_agencies.json"
if ! jq -e ".agencies[] | select(.name == \"$AGENCY\")" "$REGISTRY_FILE" > /dev/null 2>&1; then
    echo "❌ Agency '$AGENCY' not found in registry"
    exit 1
fi

# Get agency session name
SESSION=$(jq -r ".agencies[] | select(.name == \"$AGENCY\") | .session" "$REGISTRY_FILE")

# Check if session exists
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "❌ Tmux session '$SESSION' not found for agency '$AGENCY'"
    exit 1
fi

# Find target window
WINDOW_INDEX=$(tmux list-windows -t "$SESSION" -F "#{window_index}:#{window_name}" | grep ":$TARGET$" | cut -d: -f1)

if [ -z "$WINDOW_INDEX" ]; then
    echo "❌ Target '$TARGET' not found in agency '$AGENCY'"
    echo "Available targets:"
    tmux list-windows -t "$SESSION" -F "  - #{window_name}"
    exit 1
fi

# Send message using the existing send-claude-message.sh script
"$PROJECT_ROOT/send-claude-message.sh" "$SESSION:$WINDOW_INDEX" "$MESSAGE"

# Log the communication
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
AGENCY_DIR=$(jq -r ".agencies[] | select(.name == \"$AGENCY\") | .directory" "$REGISTRY_FILE")
echo "[$TIMESTAMP] INTRA → $TARGET: $MESSAGE" >> "$AGENCY_DIR/logs/activity.log"

echo "✓ Message sent to $TARGET in $AGENCY"

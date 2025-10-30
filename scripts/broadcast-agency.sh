#!/bin/bash
# Broadcast message to all agencies
# Usage: broadcast-agency.sh <from_agency> <message_json>

if [ $# -lt 2 ]; then
    echo "Usage: $0 <from_agency> <message_json>"
    echo ""
    echo "Message JSON should contain:"
    echo "  - type: alert|announcement"
    echo "  - message: broadcast content"
    echo "  - (other fields as needed)"
    echo ""
    echo "Example:"
    echo "  $0 MetaOrchestrator '{\"type\":\"alert\",\"severity\":\"high\",\"message\":\"Production deploy at 3pm\"}'"
    exit 1
fi

FROM_AGENCY="$1"
MESSAGE_JSON="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse message
MSG_TYPE=$(echo "$MESSAGE_JSON" | jq -r '.type // "announcement"')
PRIORITY=$(echo "$MESSAGE_JSON" | jq -r '.priority // "high"')

# Broadcast via message bus
echo "📡 Broadcasting from $FROM_AGENCY..."
"$PROJECT_ROOT/tools/message_bus.py" broadcast "$FROM_AGENCY" "$MSG_TYPE" "$MESSAGE_JSON" "$PRIORITY"

# Get all active agencies
REGISTRY_FILE="$PROJECT_ROOT/registry/active_agencies.json"
AGENCIES=$(jq -r '.agencies[] | select(.name != "'"$FROM_AGENCY"'") | .name' "$REGISTRY_FILE")

# Deliver to each agency coordinator
for AGENCY in $AGENCIES; do
    SESSION=$(jq -r ".agencies[] | select(.name == \"$AGENCY\") | .session" "$REGISTRY_FILE")

    if tmux has-session -t "$SESSION" 2>/dev/null; then
        FORMATTED_MSG="📢 BROADCAST from $FROM_AGENCY
Type: $MSG_TYPE | Priority: $PRIORITY
$MESSAGE_JSON"

        "$PROJECT_ROOT/send-claude-message.sh" "$SESSION:0" "$FORMATTED_MSG"
        echo "  ✓ Delivered to $AGENCY"
    else
        echo "  ⚠️  $AGENCY session not active, message queued only"
    fi
done

echo "✅ Broadcast complete"

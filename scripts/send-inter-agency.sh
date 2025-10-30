#!/bin/bash
# Send message between agencies (inter-agency communication)
# Usage: send-inter-agency.sh <from_agency> <to_agency> <message_json>

if [ $# -lt 3 ]; then
    echo "Usage: $0 <from_agency> <to_agency> <message_json>"
    echo ""
    echo "Message JSON should contain:"
    echo "  - type: handoff|request|response|alert"
    echo "  - (other fields as needed)"
    echo ""
    echo "Examples:"
    echo "  $0 CodeAgency QAAgency '{\"type\":\"handoff\",\"task\":\"Auth Module\",\"branch\":\"feature/auth\"}'"
    echo "  $0 QAAgency CodeAgency '{\"type\":\"results\",\"task\":\"Auth Module\",\"status\":\"issues_found\",\"bugs\":3}'"
    exit 1
fi

FROM_AGENCY="$1"
TO_AGENCY="$2"
MESSAGE_JSON="$3"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Verify agencies exist
REGISTRY_FILE="$PROJECT_ROOT/registry/active_agencies.json"
if ! jq -e ".agencies[] | select(.name == \"$FROM_AGENCY\")" "$REGISTRY_FILE" > /dev/null 2>&1; then
    echo "❌ Source agency '$FROM_AGENCY' not found"
    exit 1
fi

if ! jq -e ".agencies[] | select(.name == \"$TO_AGENCY\")" "$REGISTRY_FILE" > /dev/null 2>&1; then
    echo "❌ Destination agency '$TO_AGENCY' not found"
    exit 1
fi

# Parse message type and priority
MSG_TYPE=$(echo "$MESSAGE_JSON" | jq -r '.type // "request"')
PRIORITY=$(echo "$MESSAGE_JSON" | jq -r '.priority // "medium"')

# Send via message bus
MSG_ID=$("$PROJECT_ROOT/tools/message_bus.py" send "$FROM_AGENCY" "$TO_AGENCY" "$MSG_TYPE" "$MESSAGE_JSON" "$PRIORITY")

# Deliver to coordinator window of target agency
TO_SESSION=$(jq -r ".agencies[] | select(.name == \"$TO_AGENCY\") | .session" "$REGISTRY_FILE")
COORDINATOR=$(jq -r ".agencies[] | select(.name == \"$TO_AGENCY\") | .coordinator" "$REGISTRY_FILE")

# Format message for coordinator
FORMATTED_MSG="📨 INTER-AGENCY MESSAGE from $FROM_AGENCY
Type: $MSG_TYPE | Priority: $PRIORITY
Message: $MESSAGE_JSON

To acknowledge: tools/message_bus.py ack $MSG_ID"

# Send to coordinator (window 0)
"$PROJECT_ROOT/send-claude-message.sh" "$TO_SESSION:0" "$FORMATTED_MSG"

# Log in both agencies
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FROM_DIR=$(jq -r ".agencies[] | select(.name == \"$FROM_AGENCY\") | .directory" "$REGISTRY_FILE")
TO_DIR=$(jq -r ".agencies[] | select(.name == \"$TO_AGENCY\") | .directory" "$REGISTRY_FILE")

echo "[$TIMESTAMP] INTER → $TO_AGENCY: $MSG_TYPE - $MESSAGE_JSON" >> "$FROM_DIR/logs/activity.log"
echo "[$TIMESTAMP] INTER ← $FROM_AGENCY: $MSG_TYPE - $MESSAGE_JSON" >> "$TO_DIR/logs/activity.log"

echo "✓ Inter-agency message sent: $FROM_AGENCY → $TO_AGENCY"
echo "  Message ID: $MSG_ID"

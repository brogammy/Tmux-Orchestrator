#!/bin/bash
# Create a new Agency with tmux session and directory structure
# Usage: ./create_agency.sh <agency_name> [--agents agent1,agent2,...] [--capabilities cap1,cap2,...]

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
AGENCY_NAME=""
AGENTS=""
CAPABILITIES=""
COORDINATOR="coordinator"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --agents)
            AGENTS="$2"
            shift 2
            ;;
        --capabilities)
            CAPABILITIES="$2"
            shift 2
            ;;
        --coordinator)
            COORDINATOR="$2"
            shift 2
            ;;
        *)
            if [ -z "$AGENCY_NAME" ]; then
                AGENCY_NAME="$1"
            fi
            shift
            ;;
    esac
done

if [ -z "$AGENCY_NAME" ]; then
    echo "Usage: $0 <agency_name> [--agents agent1,agent2,...] [--capabilities cap1,cap2,...]"
    echo ""
    echo "Examples:"
    echo "  $0 CodeAgency --agents python-agent,js-agent,go-agent --capabilities backend,frontend,api-design"
    echo "  $0 QAAgency --agents test-lead,qa-engineer --capabilities testing,quality-assurance"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Creating Agency: $AGENCY_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create agency directory structure
AGENCY_DIR="$PROJECT_ROOT/agencies/$AGENCY_NAME"
echo "📁 Creating directory structure..."
mkdir -p "$AGENCY_DIR"/{agents,scripts,logs}

# Check if tmux session already exists
if tmux has-session -t "$AGENCY_NAME" 2>/dev/null; then
    echo "⚠️  Tmux session '$AGENCY_NAME' already exists."
    read -p "Do you want to kill it and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tmux kill-session -t "$AGENCY_NAME"
        echo "✓ Old session killed"
    else
        echo "❌ Aborting"
        exit 1
    fi
fi

# Create tmux session
echo "🖥️  Creating tmux session..."
tmux new-session -d -s "$AGENCY_NAME" -c "$AGENCY_DIR"
tmux rename-window -t "$AGENCY_NAME:0" "$COORDINATOR"

# Convert comma-separated agents to array
if [ -n "$AGENTS" ]; then
    IFS=',' read -ra AGENT_ARRAY <<< "$AGENTS"
else
    AGENT_ARRAY=()
fi

# Create windows for each agent
WINDOW_NUM=1
for AGENT in "${AGENT_ARRAY[@]}"; do
    echo "  ├─ Creating window for $AGENT..."
    tmux new-window -t "$AGENCY_NAME:$WINDOW_NUM" -n "$AGENT" -c "$AGENCY_DIR"
    ((WINDOW_NUM++))
done

# Create tools window
echo "  ├─ Creating tools window..."
tmux new-window -t "$AGENCY_NAME:$WINDOW_NUM" -n "tools" -c "$AGENCY_DIR"
((WINDOW_NUM++))

# Create sandbox window
echo "  ├─ Creating sandbox window..."
tmux new-window -t "$AGENCY_NAME:$WINDOW_NUM" -n "sandbox" -c "$AGENCY_DIR"

# Create agency.json metadata
echo "📝 Creating agency metadata..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Convert capabilities to JSON array
if [ -n "$CAPABILITIES" ]; then
    CAPS_JSON=$(echo "$CAPABILITIES" | jq -R 'split(",") | map(rtrimstr(" ") | ltrimstr(" "))')
else
    CAPS_JSON="[]"
fi

# Convert agents to JSON array
if [ -n "$AGENTS" ]; then
    AGENTS_JSON=$(echo "$AGENTS" | jq -R 'split(",") | map(rtrimstr(" ") | ltrimstr(" "))')
else
    AGENTS_JSON="[]"
fi

cat > "$AGENCY_DIR/agency.json" <<EOF
{
  "name": "$AGENCY_NAME",
  "created_at": "$TIMESTAMP",
  "tmux_session": "$AGENCY_NAME",
  "coordinator": "$COORDINATOR",
  "agents": $AGENTS_JSON,
  "capabilities": $CAPS_JSON,
  "status": "active",
  "metadata": {
    "version": "1.0",
    "directory": "$AGENCY_DIR"
  }
}
EOF

# Create coordinator instructions template
echo "📋 Creating coordinator instructions..."
cat > "$AGENCY_DIR/coordinator.md" <<EOF
# $AGENCY_NAME Coordinator

## Role
You are the coordinator for the **$AGENCY_NAME**. You manage the team of specialist agents and serve as the primary interface with other agencies and the Meta-Orchestrator.

## Responsibilities

1. **Task Management**
   - Receive high-level objectives from Meta-Orchestrator
   - Break down objectives into specific tasks
   - Assign tasks to appropriate specialist agents
   - Track progress and aggregate status updates

2. **Team Coordination**
   - Facilitate communication between agents
   - Resolve conflicts and blockers
   - Ensure work follows agency standards
   - Maintain quality and consistency

3. **Inter-Agency Communication**
   - Receive requests from other agencies
   - Coordinate handoffs and deliverables
   - Report status to Meta-Orchestrator
   - Escalate issues when necessary

4. **Quality Assurance**
   - Review work before handoff
   - Ensure testing is complete
   - Verify documentation is up-to-date
   - Maintain git discipline (commits every 30 minutes)

## Your Team

$(if [ -n "$AGENTS" ]; then
    echo "### Specialist Agents"
    IFS=',' read -ra AGENT_ARRAY <<< "$AGENTS"
    for AGENT in "${AGENT_ARRAY[@]}"; do
        echo "- **$AGENT**: See \`agents/${AGENT}.md\` for details"
    done
else
    echo "No specialist agents configured yet. You can add them later."
fi)

## Agency Capabilities

$(if [ -n "$CAPABILITIES" ]; then
    IFS=',' read -ra CAP_ARRAY <<< "$CAPABILITIES"
    for CAP in "${CAP_ARRAY[@]}"; do
        echo "- $CAP"
    done
else
    echo "No capabilities specified yet."
fi)

## Communication Protocols

### Receiving Tasks
When you receive a task from Meta-Orchestrator or another agency:
1. Acknowledge receipt immediately
2. Break down into subtasks
3. Assign to appropriate agents
4. Set up progress tracking

### Status Updates
Report status every hour or when significant progress is made:
- What's completed
- What's in progress
- Any blockers
- Estimated completion time

### Handoffs to Other Agencies
When handing off work:
1. Ensure all tests pass
2. Verify documentation is complete
3. Create detailed handoff message
4. Use message bus for formal handoff

## Tools Available

- **Message Bus**: \`tools/message_bus.py\` for inter-agency communication
- **Agency Scripts**: \`scripts/\` directory for agency-specific tools
- **Sandbox**: \`sandbox/\` window for testing

## Getting Started

1. Review your team members in \`agents/\` directory
2. Check current tasks (will be sent via message bus)
3. Set up your work environment
4. Start coordinating your team!

---
**Agency**: $AGENCY_NAME
**Coordinator**: $COORDINATOR
**Status**: Active
EOF

# Create agent instruction templates
if [ -n "$AGENTS" ]; then
    echo "📋 Creating agent instructions..."
    IFS=',' read -ra AGENT_ARRAY <<< "$AGENTS"
    for AGENT in "${AGENT_ARRAY[@]}"; do
        cat > "$AGENCY_DIR/agents/${AGENT}.md" <<EOF
# $AGENT - $AGENCY_NAME

## Role
You are a specialist agent in the **$AGENCY_NAME**. Your focus is on [CUSTOMIZE THIS].

## Responsibilities
1. Execute tasks assigned by the coordinator
2. Report progress regularly
3. Collaborate with peer agents
4. Follow agency standards and best practices
5. Commit work every 30 minutes

## Tools Available
- Agency scripts in \`../scripts/\`
- Sandbox environment for testing
- Message bus for communication

## Communication
- Report to coordinator every hour
- Escalate blockers immediately
- Share insights with peer agents
- Use structured message formats

## Getting Started
1. Wait for task assignment from coordinator
2. Review task requirements
3. Plan your approach
4. Execute and report progress

---
**Agent**: $AGENT
**Agency**: $AGENCY_NAME
**Status**: Ready
EOF
    done
fi

# Create initial log file
echo "📊 Creating activity log..."
cat > "$AGENCY_DIR/logs/activity.log" <<EOF
=== $AGENCY_NAME Activity Log ===
Created: $TIMESTAMP
Status: Active

EOF

# Register agency in global registry
echo "📝 Registering agency..."
REGISTRY_FILE="$PROJECT_ROOT/registry/active_agencies.json"

# Read existing registry
REGISTRY=$(cat "$REGISTRY_FILE")

# Create new agency entry
NEW_AGENCY=$(cat <<EOF
{
  "name": "$AGENCY_NAME",
  "session": "$AGENCY_NAME",
  "created_at": "$TIMESTAMP",
  "status": "active",
  "capabilities": $CAPS_JSON,
  "agents": $AGENTS_JSON,
  "directory": "$AGENCY_DIR"
}
EOF
)

# Add to registry using jq
echo "$REGISTRY" | jq ".agencies += [$NEW_AGENCY] | .last_updated = \"$TIMESTAMP\"" > "$REGISTRY_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Agency Created Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Agency Directory: $AGENCY_DIR"
echo "🖥️  Tmux Session: $AGENCY_NAME"
echo ""
echo "Windows created:"
echo "  0: $COORDINATOR (coordinator)"
WINDOW_NUM=1
for AGENT in "${AGENT_ARRAY[@]}"; do
    echo "  $WINDOW_NUM: $AGENT"
    ((WINDOW_NUM++))
done
echo "  $WINDOW_NUM: tools"
((WINDOW_NUM++))
echo "  $WINDOW_NUM: sandbox"
echo ""
echo "Next steps:"
echo "  1. Attach to session: tmux attach -t $AGENCY_NAME"
echo "  2. Start Claude in coordinator window: claude"
echo "  3. Brief coordinator with: cat $AGENCY_DIR/coordinator.md"
echo ""
echo "Or brief automatically:"
echo "  tmux send-keys -t $AGENCY_NAME:0 'claude' Enter"
echo "  sleep 5"
echo "  $PROJECT_ROOT/send-claude-message.sh $AGENCY_NAME:0 \"\$(cat $AGENCY_DIR/coordinator.md)\""
echo ""

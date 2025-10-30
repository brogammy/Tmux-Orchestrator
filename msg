#!/bin/bash
# Simple wrapper for talk.py - shorthand for messaging
# Usage: ./msg orchestrator "your message"
#        ./msg CodeAgency:0 "your message"

python3 "$(dirname "$0")/talk.py" "$@"

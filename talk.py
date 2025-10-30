#!/usr/bin/env python3
"""
Simple interface to talk to agencies/orchestrator from Claude Code
Usage: python3 talk.py <session:window> <message>
       python3 talk.py orchestrator "What's your status?"
"""

import sys
import subprocess
import time
import json
from pathlib import Path

def send_message(target, message):
    """Send message to tmux window"""
    # If target is just a session name, assume window 0
    if ':' not in target:
        target = f"{target}:0"

    try:
        # Send the message
        subprocess.run(
            ['tmux', 'send-keys', '-t', target, message],
            check=True,
            capture_output=True
        )

        # Wait for UI to register
        time.sleep(0.5)

        # Send Enter
        subprocess.run(
            ['tmux', 'send-keys', '-t', target, 'Enter'],
            check=True,
            capture_output=True
        )

        print(f"✓ Message sent to {target}")
        return True

    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to send message: {e.stderr.decode()}")
        return False

def check_session(session_name):
    """Check if tmux session exists"""
    try:
        result = subprocess.run(
            ['tmux', 'has-session', '-t', session_name],
            capture_output=True
        )
        return result.returncode == 0
    except Exception:
        return False

def list_sessions():
    """List all tmux sessions"""
    try:
        result = subprocess.run(
            ['tmux', 'ls'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return "No sessions running"
    except Exception:
        return "Tmux not available or no sessions"

def peek_window(target, lines=30):
    """Peek at window output without attaching"""
    if ':' not in target:
        target = f"{target}:0"

    try:
        result = subprocess.run(
            ['tmux', 'capture-pane', '-t', target, '-p'],
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip().split('\n')
        # Return last N lines
        return '\n'.join(output[-lines:])
    except Exception as e:
        return f"Error: {str(e)}"

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  talk.py <session:window> <message>  - Send message")
        print("  talk.py list                         - List sessions")
        print("  talk.py peek <session:window>        - Peek at window")
        print("")
        print("Examples:")
        print("  talk.py orchestrator 'What is your status?'")
        print("  talk.py CodeAgency:0 'Please create a status report'")
        print("  talk.py peek orchestrator")
        print("  talk.py list")
        sys.exit(1)

    command = sys.argv[1]

    if command == "list":
        print("Active tmux sessions:")
        print(list_sessions())
        sys.exit(0)

    if command == "peek":
        if len(sys.argv) < 3:
            print("Usage: talk.py peek <session:window>")
            sys.exit(1)
        target = sys.argv[2]
        print(f"Last 30 lines from {target}:")
        print("-" * 60)
        print(peek_window(target))
        sys.exit(0)

    # Otherwise, treat as send message
    target = sys.argv[1]
    if len(sys.argv) < 3:
        print("Error: Message required")
        print("Usage: talk.py <session:window> <message>")
        sys.exit(1)

    message = ' '.join(sys.argv[2:])

    # Check if session exists
    session_name = target.split(':')[0]
    if not check_session(session_name):
        print(f"✗ Session '{session_name}' not found")
        print("\nAvailable sessions:")
        print(list_sessions())
        sys.exit(1)

    success = send_message(target, message)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

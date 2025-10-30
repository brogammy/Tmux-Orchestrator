#!/usr/bin/env python3
"""
Voice control interface for Tmux Orchestrator
Speak naturally, AI interprets intent and executes commands
"""

import subprocess
import json
import sys
import time
from pathlib import Path

def execute_command(command_type, params):
    """Execute orchestrator commands based on interpreted intent"""

    if command_type == "send_message":
        target = params.get("target", "orchestrator:0")
        message = params.get("message", "")

        if not message:
            return {"error": "No message provided"}

        try:
            # Send message using tmux
            subprocess.run(['tmux', 'send-keys', '-t', target, message], check=True)
            time.sleep(0.3)
            subprocess.run(['tmux', 'send-keys', '-t', target, 'Enter'], check=True)
            return {"success": True, "action": f"Sent message to {target}"}
        except Exception as e:
            return {"error": str(e)}

    elif command_type == "create_agency":
        name = params.get("name", "")
        agents = params.get("agents", [])
        capabilities = params.get("capabilities", [])

        if not name:
            return {"error": "Agency name required"}

        agent_str = ",".join(agents) if agents else ""
        cap_str = ",".join(capabilities) if capabilities else ""

        cmd = ["./scripts/create_agency.sh", name]
        if agent_str:
            cmd.extend(["--agents", agent_str])
        if cap_str:
            cmd.extend(["--capabilities", cap_str])

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return {"success": True, "action": f"Created agency {name}", "output": result.stdout}
        except Exception as e:
            return {"error": str(e)}

    elif command_type == "check_status":
        target = params.get("target", "orchestrator:0")

        try:
            result = subprocess.run(
                ['tmux', 'capture-pane', '-t', target, '-p'],
                capture_output=True, text=True, check=True
            )
            lines = result.stdout.strip().split('\n')[-30:]
            return {"success": True, "status": "\n".join(lines)}
        except Exception as e:
            return {"error": str(e)}

    elif command_type == "list_sessions":
        try:
            result = subprocess.run(['tmux', 'ls'], capture_output=True, text=True)
            if result.returncode == 0:
                return {"success": True, "sessions": result.stdout.strip()}
            return {"success": True, "sessions": "No sessions running"}
        except Exception as e:
            return {"error": str(e)}

    elif command_type == "start_orchestrator":
        try:
            result = subprocess.run(['./start-orchestrator.sh'], capture_output=True, text=True, check=True)
            return {"success": True, "action": "Started orchestrator", "output": result.stdout}
        except Exception as e:
            return {"error": str(e)}

    elif command_type == "message_bus":
        action = params.get("action", "pending")
        agency = params.get("agency", "CodeAgency")

        cmd = ["python3", "tools/message_bus.py", action, agency]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return {"success": True, "output": result.stdout}
        except Exception as e:
            return {"error": str(e)}

    return {"error": "Unknown command type"}


def interpret_intent(transcription):
    """
    Parse natural speech and determine intent
    This is where you'd integrate with Claude API or another LLM
    For now, simple keyword matching
    """
    text = transcription.lower()

    # Status checks
    if any(word in text for word in ["status", "what's happening", "check on", "how is"]):
        if "codeagency" in text:
            return ("check_status", {"target": "CodeAgency:0"})
        return ("check_status", {"target": "orchestrator:0"})

    # List sessions
    if any(word in text for word in ["list", "show sessions", "what's running"]):
        return ("list_sessions", {})

    # Create agency
    if "create" in text and "agency" in text:
        # Extract agency name (simple heuristic)
        words = text.split()
        name = None
        for i, word in enumerate(words):
            if word == "agency" and i > 0:
                name = words[i-1].title() + "Agency"
                break

        if not name and "qa" in text:
            name = "QAAgency"
        elif not name and "security" in text:
            name = "SecurityAgency"
        elif not name and "devops" in text:
            name = "DevOpsAgency"

        return ("create_agency", {"name": name or "NewAgency", "agents": [], "capabilities": []})

    # Start orchestrator
    if "start" in text and "orchestrator" in text:
        return ("start_orchestrator", {})

    # Message bus checks
    if "message" in text and ("queue" in text or "pending" in text):
        return ("message_bus", {"action": "pending", "agency": "CodeAgency"})

    # Send message (default)
    # Remove common command phrases to get the actual message
    message = transcription
    for phrase in ["tell the orchestrator", "tell orchestrator", "send to orchestrator", "orchestrator"]:
        message = message.replace(phrase, "").strip()

    target = "orchestrator:0"
    if "codeagency" in text.lower():
        target = "CodeAgency:0"
        message = message.replace("CodeAgency", "").replace("codeagency", "").strip()

    if message:
        return ("send_message", {"target": target, "message": message})

    return (None, {"error": "Could not interpret intent"})


def main():
    """
    Main voice control interface
    In production, this would continuously listen for voice input
    For now, takes text input as simulation
    """

    if len(sys.argv) < 2:
        print("Voice Control Interface for Tmux Orchestrator")
        print("")
        print("Usage: python3 voice-control.py <your natural speech>")
        print("")
        print("Examples:")
        print('  python3 voice-control.py "What\'s the status of the orchestrator?"')
        print('  python3 voice-control.py "Tell the orchestrator to create a hello world API"')
        print('  python3 voice-control.py "Create a QA agency"')
        print('  python3 voice-control.py "What sessions are running?"')
        print('  python3 voice-control.py "Check on CodeAgency"')
        print("")
        print("Note: This simulates voice input. For actual voice, integrate with:")
        print("  - whisper.cpp for local STT")
        print("  - vosk for offline speech recognition")
        print("  - or system speech recognition")
        sys.exit(0)

    # Get the spoken text (in production, from speech-to-text)
    spoken_text = ' '.join(sys.argv[1:])

    print(f"🎤 You said: \"{spoken_text}\"")
    print()

    # Interpret intent
    command_type, params = interpret_intent(spoken_text)

    if command_type is None:
        print(f"❌ {params.get('error', 'Could not understand request')}")
        sys.exit(1)

    print(f"🧠 Interpreted as: {command_type}")
    print(f"📋 Parameters: {json.dumps(params, indent=2)}")
    print()

    # Execute command
    print("⚡ Executing...")
    result = execute_command(command_type, params)

    print()
    if result.get("success"):
        print(f"✅ {result.get('action', 'Done')}")
        if "output" in result:
            print(result["output"])
        if "status" in result:
            print("Status:")
            print(result["status"])
        if "sessions" in result:
            print("Sessions:")
            print(result["sessions"])
    else:
        print(f"❌ Error: {result.get('error', 'Unknown error')}")


if __name__ == "__main__":
    main()

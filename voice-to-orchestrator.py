#!/usr/bin/env python3
"""
Voice-to-Orchestrator: Speak naturally and talk directly to orchestrator Claude
Your voice is transcribed and sent to the orchestrator tmux window
"""

import subprocess
import sys
import time
import os

ORCHESTRATOR_TARGET = "orchestrator:0"

def send_to_orchestrator(message):
    """Send message directly to orchestrator Claude in tmux"""
    try:
        # Send the message
        subprocess.run(
            ['tmux', 'send-keys', '-t', ORCHESTRATOR_TARGET, message],
            check=True,
            capture_output=True
        )
        time.sleep(0.3)

        # Press Enter
        subprocess.run(
            ['tmux', 'send-keys', '-t', ORCHESTRATOR_TARGET, 'Enter'],
            check=True,
            capture_output=True
        )

        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to send to orchestrator: {e.stderr.decode()}")
        return False


def check_orchestrator_running():
    """Check if orchestrator session exists"""
    try:
        result = subprocess.run(
            ['tmux', 'has-session', '-t', 'orchestrator'],
            capture_output=True
        )
        return result.returncode == 0
    except Exception:
        return False


def start_orchestrator():
    """Start orchestrator if not running"""
    print("🚀 Starting orchestrator...")
    try:
        subprocess.run(['./start-orchestrator.sh'], check=True)
        time.sleep(2)
        return True
    except Exception as e:
        print(f"❌ Failed to start orchestrator: {e}")
        return False


def transcribe_audio(audio_file=None):
    """
    Transcribe audio to text
    Options:
    1. Use system speech recognition (macOS: dictation, Linux: various)
    2. Use whisper.cpp locally
    3. Use online API

    For now, this is a placeholder - you'll need to integrate actual STT
    """
    # TODO: Integrate actual speech-to-text
    # Example with whisper.cpp:
    # subprocess.run(['whisper', audio_file, '--output-format', 'txt'])

    print("🎤 [Voice transcription not yet implemented]")
    print("For now, type what you want to say:")
    return input("> ")


def listen_mode():
    """Continuous listening mode"""
    print("🎤 Voice-to-Orchestrator Active")
    print("Speak naturally - your words go directly to the orchestrator")
    print("(Press Ctrl+C to exit)")
    print()

    if not check_orchestrator_running():
        print("⚠️  Orchestrator not running")
        response = input("Start it now? (y/n): ")
        if response.lower() == 'y':
            if not start_orchestrator():
                return
        else:
            return

    try:
        while True:
            # In production, this would capture audio and transcribe
            # For now, text input as simulation
            text = transcribe_audio()

            if not text.strip():
                continue

            if text.lower() in ['exit', 'quit', 'stop']:
                print("👋 Stopping voice interface")
                break

            print(f"📤 Sending to orchestrator: \"{text}\"")
            if send_to_orchestrator(text):
                print("✅ Sent")
            print()

    except KeyboardInterrupt:
        print("\n👋 Voice interface stopped")


def main():
    if len(sys.argv) > 1:
        # Direct mode: send message from command line
        message = ' '.join(sys.argv[1:])

        if not check_orchestrator_running():
            print("❌ Orchestrator not running")
            print("Start with: ./start-orchestrator.sh")
            sys.exit(1)

        print(f"🎤 You: \"{message}\"")
        if send_to_orchestrator(message):
            print("✅ Sent to orchestrator")
        else:
            sys.exit(1)
    else:
        # Interactive listening mode
        listen_mode()


if __name__ == "__main__":
    main()

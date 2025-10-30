#!/usr/bin/env python3
"""
Simple voice interface to orchestrator
Uses Google Speech Recognition (requires internet) or offline options
"""

import subprocess
import time
import sys

try:
    import speech_recognition as sr
    HAS_SR = True
except ImportError:
    HAS_SR = False


def send_to_orchestrator(text):
    """Send transcribed text directly to orchestrator"""
    try:
        subprocess.run(['tmux', 'send-keys', '-t', 'orchestrator:0', text], check=True)
        time.sleep(0.3)
        subprocess.run(['tmux', 'send-keys', '-t', 'orchestrator:0', 'Enter'], check=True)
        return True
    except:
        return False


def listen_once_google():
    """Listen for one voice command using Google Speech Recognition"""
    r = sr.Recognizer()

    with sr.Microphone() as source:
        print("🎤 Listening... (speak now)")
        r.adjust_for_ambient_noise(source, duration=0.5)
        audio = r.listen(source)

    print("🔄 Processing...")

    try:
        text = r.recognize_google(audio)
        return text
    except sr.UnknownValueError:
        print("❌ Could not understand audio")
        return None
    except sr.RequestError as e:
        print(f"❌ Error: {e}")
        return None


def listen_continuous():
    """Continuous voice listening mode"""
    print("=" * 60)
    print("🎤 VOICE MODE: Speak directly to orchestrator")
    print("=" * 60)
    print("Say 'stop listening' to exit")
    print()

    # Check orchestrator running
    result = subprocess.run(['tmux', 'has-session', '-t', 'orchestrator'], capture_output=True)
    if result.returncode != 0:
        print("❌ Orchestrator not running")
        print("Start with: ./start-orchestrator.sh")
        return

    while True:
        text = listen_once_google()

        if text:
            print(f"📝 You said: \"{text}\"")

            # Exit commands
            if any(word in text.lower() for word in ['stop listening', 'exit', 'quit']):
                print("👋 Stopping voice mode")
                break

            # Send to orchestrator
            print("📤 Sending to orchestrator...")
            if send_to_orchestrator(text):
                print("✅ Sent\n")
            else:
                print("❌ Failed to send\n")

        time.sleep(0.5)


def main():
    if not HAS_SR:
        print("❌ speech_recognition not installed")
        print("")
        print("Install with:")
        print("  pip3 install SpeechRecognition pyaudio")
        print("")
        print("On Ubuntu/Linux, also:")
        print("  sudo apt-get install portaudio19-dev python3-pyaudio")
        print("")
        print("OR use manual mode:")
        print("  python3 voice-to-orchestrator.py")
        sys.exit(1)

    try:
        listen_continuous()
    except KeyboardInterrupt:
        print("\n👋 Voice mode stopped")


if __name__ == "__main__":
    main()

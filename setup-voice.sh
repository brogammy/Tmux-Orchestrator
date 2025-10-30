#!/bin/bash
# Setup voice recognition for orchestrator

echo "🎤 Voice Recognition Setup"
echo ""
echo "Choose speech-to-text option:"
echo ""
echo "1. Whisper.cpp (Local, offline, accurate)"
echo "2. Vosk (Local, offline, fast)"
echo "3. System recognition (depends on OS)"
echo "4. Manual (type what you want to say)"
echo ""
read -p "Choice (1-4): " choice

case $choice in
    1)
        echo "Installing whisper.cpp..."
        echo "This requires compiling whisper.cpp from source"
        echo "Visit: https://github.com/ggerganov/whisper.cpp"
        echo ""
        echo "Quick install:"
        echo "  git clone https://github.com/ggerganov/whisper.cpp"
        echo "  cd whisper.cpp"
        echo "  make"
        echo "  ./models/download-ggml-model.sh base.en"
        ;;
    2)
        echo "Installing Vosk..."
        pip3 install vosk
        echo ""
        echo "Download model:"
        echo "  wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
        echo "  unzip vosk-model-small-en-us-0.15.zip"
        ;;
    3)
        echo "System recognition varies by OS"
        echo ""
        echo "Ubuntu/Linux: Install speech-recognition"
        echo "  pip3 install SpeechRecognition pyaudio"
        echo "  sudo apt-get install portaudio19-dev python3-pyaudio"
        ;;
    4)
        echo "✅ Manual mode - no installation needed"
        echo "You'll type what you want to say to orchestrator"
        ;;
esac

echo ""
echo "After setup, run:"
echo "  python3 voice-to-orchestrator.py"

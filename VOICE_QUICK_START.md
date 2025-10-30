# Voice Module - Quick Start Guide

## What Is This?

A complete voice input/output system for Tmux-Orchestrator that lets you:
- 🎤 Speak commands instead of typing
- 💬 Get voice responses from the system
- 📝 Track all voice commands
- 🌍 Support 12+ languages
- ✅ Full desktop browser support

## Get Started in 30 Seconds

### Step 1: Open Dashboard

Open your browser to: **`http://localhost:3000`**

### Step 2: Look for Voice Control Panel

At the top of the dashboard, you'll see:
```
🎤 Voice Control
[🎤 Speak] [Ready] [🗑️ Clear History]
```

### Step 3: Click the Microphone Button

Click **"🎤 Speak"** to start recording

### Step 4: Speak a Command

Say something like:
- "show status"
- "list agencies"
- "create new project"

### Step 5: See Results

The system will:
1. Display your words in real-time
2. Show confidence score
3. Send command to orchestrator
4. Speak confirmation back to you
5. Add to history

## Common Commands

```
"show status"          → Display system status
"list agencies"        → Show available agencies
"build new feature"    → Start feature development
"check history"        → View past commands
"clear all"            → Clear history
```

## Troubleshooting

### "Web Speech API not supported"
- Use Chrome, Edge, or Safari
- Firefox works for voice output only

### "No speech detected"
- Speak louder and clearer
- Reduce background noise
- Check microphone is working

### "Confidence is too low"
- Speak more clearly
- Use shorter phrases
- Ensure language matches

### "TTS not working"
- Check "Text-to-Speech" is toggled ON
- Check system volume is not muted
- Try different browser

## Settings

### Change Language
Select from dropdown: English, Spanish, French, German, Italian, etc.

### Toggle Text-to-Speech
Check/uncheck the TTS checkbox to hear or silence responses

### Clear History
Click "🗑️ Clear History" to remove all past commands

## Visual Indicators

| State | Color | Meaning |
|-------|-------|---------|
| Ready | Blue | Click to start recording |
| Recording | Red (blinking) | System is listening |
| Processing | Orange | Transcribing speech |
| Speaking | Green (blinking) | System is responding |
| Error | Red | Something went wrong |

## Browser Support

✅ **Works Best:**
- Chrome 25+
- Edge 79+
- Safari 14.1+
- Opera 27+

⚠️ **Partial Support:**
- Firefox (voice responses only, no recognition)

❌ **Not Supported:**
- Internet Explorer
- Old Safari versions

## Tips

1. **Speak clearly** - The better the audio quality, the better the transcription
2. **Use short phrases** - "show status" works better than long sentences
3. **Wait for processing** - Give it a second after speaking
4. **Check permissions** - Browser may ask for microphone access (allow it)
5. **Use microphone icon** - Click it to start, click again to stop

## Advanced Features

### Voice History
The system keeps the last 5 commands you spoke. Each shows:
- The exact words transcribed
- Confidence score (0-100%)
- Time of command
- Status (received/sent/executed)

### Export History
(Developer feature) Download full voice history as JSON for analysis

### Session Management
Each session gets a unique ID. You can track commands across sessions.

## API Integration

### For Developers

The voice module sends transcribed commands to:
```
POST /api/execute-command
{
  "command": "show status"
}
```

The API returns:
```json
{
  "response": "System is running normally",
  "status": "success"
}
```

## FAQ

**Q: Does the system hear me if I don't click the button?**
A: No, push-to-talk mode requires you to click the button to start recording.

**Q: Is my voice saved anywhere?**
A: No, voice is processed by Google's servers but not stored. Command history is saved in your browser only.

**Q: Can I use this on mobile?**
A: Yes, iOS Safari 14.1+ and Android Chrome work.

**Q: How long can I talk?**
A: Maximum 30 seconds per recording. For longer commands, record multiple times.

**Q: Can I use multiple languages?**
A: Yes, select language before recording. But switch before recording, not during.

**Q: What happens if the network is slow?**
A: Transcription might take longer, but it will eventually complete.

## Next Steps

1. **Try it out** - Click the button and speak!
2. **Review CLAUDE.md** - Understand the architecture
3. **Read voice/README.md** - Full API documentation
4. **Check examples** - See how to integrate elsewhere
5. **Customize** - Modify voice/config.js for your needs

## Need Help?

1. Check browser console (F12) for errors
2. Verify microphone is connected
3. Try different browser
4. Read troubleshooting in voice/README.md
5. Check VOICE_MODULE_SUMMARY.md for technical details

---

**Happy voice commanding!** 🎤✨

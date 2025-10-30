# Voice Module

A standalone, modular voice input/output system for the Tmux-Orchestrator dashboard and CLI using Web Speech API.

## Features

- **Push-to-Talk Recording**: Click to start, click to stop
- **Real-Time Transcription**: See text as you speak
- **Text-to-Speech**: System speaks responses back
- **Command History**: Track all voice commands with timestamps and confidence scores
- **Multi-Language Support**: 12+ languages available
- **Browser-Based**: No backend dependencies (uses native Web Speech API)
- **Event-Driven Architecture**: Easy integration with other systems

## Installation

### For Browser (Dashboard)

The voice module is already integrated into the dashboard at `/dashboard/index.html`.

```html
<!-- Scripts are automatically loaded -->
<script src="../voice/index.js"></script>
<script src="../voice/VoiceModule.js"></script>
<script src="./voice-ui.js"></script>
```

### For Node.js (CLI or Backend)

```bash
npm install  # No additional dependencies needed
```

## Browser Compatibility

| Browser | Recognition | Synthesis | Status |
|---------|-------------|-----------|--------|
| Chrome | ✅ | ✅ | Fully supported |
| Edge | ✅ | ✅ | Fully supported |
| Firefox | ❌ | ✅ | Synthesis only |
| Safari | ✅ | ✅ | Supported |
| Opera | ✅ | ✅ | Fully supported |

**Minimum Requirements**: Chrome 25+, Edge 79+, Safari 14.1+, Firefox 25+

## Quick Start

### Dashboard Voice Control

1. Open the dashboard: `http://localhost:3000`
2. Look for the **🎤 Voice Control** panel at the top
3. Click the **🎤 Speak** button
4. Speak your command clearly
5. Click **⏹️ Stop** or wait for automatic detection
6. Transcribed text appears in real-time
7. Confidence score shown (0-100%)
8. Command added to history
9. System speaks confirmation

### Example Commands

```
"show status"
"list all agencies"
"build new agency"
"create frontend component"
```

## API Reference

### VoiceModule

Core class for voice input/output.

```javascript
const { createVoiceModule } = require('./voice');

// Create a voice instance
const voice = createVoiceModule({
  language: 'en-US',
  continuous: false,
  interimResults: true,
  ttsEnabled: true
});

// Start recording
await voice.startRecording();

// Stop recording
await voice.stopRecording();

// Speak text
await voice.speak('Hello, this is a test');

// Stop speaking
voice.stopSpeaking();

// Get history
const history = voice.getHistory(10); // Get last 10 commands

// Clear history
voice.clearHistory();

// Set language
voice.setLanguage('es-ES');

// Get current state
const state = voice.getState(); // 'idle', 'recording', 'processing', 'speaking'

// Check if recording
const recording = voice.isRecording();

// Check if speaking
const speaking = voice.isSpeaking();
```

### Events

Subscribe to voice events:

```javascript
// Recording started
voice.on('recordingStarted', () => {
  console.log('Recording started');
});

// Real-time transcription
voice.on('transcribing', (event) => {
  console.log('Interim:', event.interim);
  console.log('Final:', event.final);
});

// Final transcript received
voice.on('transcript', (transcript) => {
  console.log('Text:', transcript.text);
  console.log('Confidence:', transcript.confidence);
});

// Speaking started
voice.on('speaking', (event) => {
  console.log('Speaking:', event.text);
});

// Speaking ended
voice.on('speakingEnded', () => {
  console.log('Speech ended');
});

// State changed
voice.on('stateChanged', (event) => {
  console.log('State:', event.oldState, '→', event.newState);
});

// Error occurred
voice.on('error', (event) => {
  console.error('Error:', event.error);
});

// History updated
voice.on('historyUpdated', (history) => {
  console.log('History updated:', history);
});
```

### Configuration

Configure voice behavior:

```javascript
const voice = createVoiceModule({
  // Recognition settings
  language: 'en-US',
  continuous: false,
  interimResults: true,
  confidenceThreshold: 0.5,

  // Synthesis settings
  rate: 1.0,      // 0.1 to 10
  pitch: 1.0,     // 0 to 2
  volume: 1.0,    // 0 to 1
  voiceIndex: 0,

  // Module behavior
  autoSendOnFinal: true,
  maxHistory: 100,
  ttsEnabled: true,
  loggingEnabled: true
});
```

### VoiceHistory

Manage voice command history.

```javascript
const { VoiceHistory } = require('./voice');

// Create history manager
const history = new VoiceHistory({
  maxSize: 500,
  persistence: 'localStorage', // or 'file'
  persistenceKey: 'voiceHistory'
});

// Add entry
history.add({
  id: 'transcript-1',
  text: 'show status',
  confidence: 0.95,
  timestamp: Date.now(),
  sessionId: 'session-123'
});

// Get all entries
const all = history.getAll();

// Get recent entries
const recent = history.getRecent(10);

// Search
const results = history.search('agency');

// Filter by status
const sent = history.getByStatus('sent');

// Update status
history.updateStatus('transcript-1', 'sent', { sentAt: Date.now() });

// Get statistics
const stats = history.getStats();
// {
//   totalCommands: 5,
//   successfulCommands: 4,
//   failedCommands: 1,
//   averageConfidence: 0.923
// }

// Export history
const exported = history.export();

// Import history
history.import(exported);

// Clear history
history.clear();
```

## Dashboard Integration

### Voice UI Handler

The `DashboardVoiceUI` class handles all dashboard UI interactions.

```javascript
const voiceUI = new DashboardVoiceUI({
  voiceModule: voice,
  buttonSelector: '.voice-btn',
  transcriptionDisplay: '.transcription-display',
  historyDisplay: '.voice-history',
  indicatorSelector: '.voice-indicator',
  commandHandler: async (transcript) => {
    // Handle the transcript
    console.log('Received command:', transcript);
    // Send to orchestrator or API
  }
});

// Get UI info
const info = voiceUI.getInfo();

// Destroy UI (cleanup)
voiceUI.destroy();
```

## Configuration

Edit `voice/config.js` to customize defaults:

```javascript
module.exports = {
  recognition: {
    language: 'en-US',
    continuous: false,
    interimResults: true,
    confidenceThreshold: 0.5
  },

  synthesis: {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  },

  module: {
    autoSendOnFinal: true,
    maxHistory: 100,
    ttsEnabled: true
  },

  supportedLanguages: [
    { code: 'en-US', name: 'English (US)' },
    { code: 'es-ES', name: 'Spanish' },
    // ... more languages
  ]
};
```

## Troubleshooting

### Microphone Not Working

1. **Check browser support**: Voice only works in Chrome, Edge, Safari, Opera
2. **Check permissions**: Ensure the browser has microphone access
3. **Check HTTPS**: Web Speech API requires HTTPS (except localhost)
4. **Check device**: Ensure microphone is connected and working

### No Speech Detected

1. **Speak louder**: Web Speech API needs clear audio
2. **Reduce background noise**: Noisy environments cause issues
3. **Try again**: Sometimes the API needs multiple attempts
4. **Check language**: Ensure selected language matches speech

### Low Confidence Scores

- Speak more clearly
- Reduce background noise
- Increase volume
- Use shorter phrases
- Select correct language

### TTS Not Working

1. Check if TTS is enabled in settings
2. Try a different browser
3. Check system volume
4. Restart the dashboard

### History Not Persisting

1. Check browser localStorage is enabled
2. Clear browser cache if needed
3. Check browser privacy settings
4. Use incognito/private mode for testing

## Advanced Usage

### Custom Command Handler

```javascript
const voiceUI = new DashboardVoiceUI({
  voiceModule: voice,
  // ... other options
  commandHandler: async (transcript) => {
    // Custom handling
    if (transcript.includes('status')) {
      const status = await getSystemStatus();
      voice.speak(`Status: ${status}`);
    } else if (transcript.includes('agency')) {
      const agencies = await listAgencies();
      voice.speak(`Found ${agencies.length} agencies`);
    }
  }
});
```

### Language Switching

```javascript
// Get available languages
const languages = voice.getAvailableVoices();

// Change language
voice.setLanguage('es-ES');

// Change TTS voice
voice.setVoice(1); // Use second voice
```

### History Export

```javascript
// Export history to JSON
const exported = voice.history.export();

// Download as file
const blob = new Blob([JSON.stringify(exported)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'voice-history.json';
a.click();
```

## Performance

- **Recording latency**: < 100ms
- **Transcription time**: 0.5-2 seconds (depends on length)
- **TTS response**: < 500ms
- **History lookup**: < 10ms (100 entries)

## Security Notes

- Voice data is processed by Google's servers (Web Speech API)
- No data is stored on the application server
- History is stored in browser localStorage (not encrypted)
- For sensitive applications, use HTTPS and consider local whisper.cpp

## File Structure

```
voice/
├── VoiceModule.js         # Core voice logic
├── WebSpeechAdapter.js    # Browser API wrapper
├── VoiceHistory.js        # History management
├── config.js              # Default configuration
├── index.js               # Module exports
├── README.md              # This file
└── examples/
    ├── basic.html         # Basic usage example
    ├── advanced.html      # Advanced features
    └── cli-integration.js # CLI integration example
```

## Examples

See `voice/examples/` for:
- `basic.html`: Simple voice demo
- `advanced.html`: All features showcase
- `cli-integration.js`: CLI usage pattern

## Future Enhancements

- [ ] Local whisper.cpp integration
- [ ] Wake word detection ("Hey Orchestrator")
- [ ] Continuous listening mode
- [ ] Voice command shortcuts
- [ ] Command suggestions
- [ ] Acoustic echo cancellation
- [ ] Voice authentication
- [ ] Multiple language mixing

## Contributing

To extend the voice module:

1. Add methods to `VoiceModule` for new functionality
2. Update `WebSpeechAdapter` for browser API changes
3. Add event emissions for new behaviors
4. Update documentation
5. Test in multiple browsers

## License

Part of Tmux-Orchestrator project

## Support

For issues or questions:
1. Check browser console for errors: `F12` → Console
2. Verify browser compatibility
3. Check HTTPS/localhost access
4. Review troubleshooting section above

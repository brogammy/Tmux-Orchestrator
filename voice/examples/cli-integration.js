/**
 * CLI Voice Integration Example
 *
 * Shows how to integrate the VoiceModule with a Node.js CLI application
 *
 * Usage:
 *   node cli-integration.js
 */

const VoiceModule = require('../VoiceModule');
const VoiceHistory = require('../VoiceHistory');

/**
 * CLI Voice Handler - Provides voice input for Node.js applications
 */
class CLIVoiceHandler {
  constructor(options = {}) {
    this.voice = new VoiceModule({
      language: options.language || 'en-US',
      continuous: false,
      interimResults: true,
      autoSendOnFinal: false,
      ttsEnabled: options.ttsEnabled !== false
    });

    this.history = new VoiceHistory({
      maxSize: 100,
      persistence: options.persistence || null,
      persistenceKey: options.persistenceKey || null
    });

    this.commandHandler = options.commandHandler || this.defaultHandler;
    this.isListening = false;
  }

  /**
   * Start listening for voice commands
   */
  async startListening() {
    if (this.isListening) {
      console.log('[Voice] Already listening');
      return;
    }

    this.isListening = true;
    console.log('\n🎤 Listening for voice commands (say "help" for available commands)...\n');

    this.setupEventHandlers();

    try {
      await this.voice.startRecording();
    } catch (error) {
      console.error('[Voice] Error starting recording:', error.message);
      this.isListening = false;
    }
  }

  /**
   * Setup voice event handlers
   */
  setupEventHandlers() {
    this.voice.on('recordingStarted', () => {
      this.log('Recording started...');
    });

    this.voice.on('transcribing', (event) => {
      if (event.interim) {
        process.stdout.write(`\r📝 ${event.interim.substring(0, 60)}`);
      }
    });

    this.voice.on('transcript', async (transcript) => {
      console.log(`\n✅ Transcript: "${transcript.text}" (${(transcript.confidence * 100).toFixed(0)}%)\n`);

      // Add to history
      this.history.add(transcript);

      // Handle the command
      await this.commandHandler(transcript.text);

      // Continue listening
      if (this.isListening) {
        try {
          await this.voice.startRecording();
        } catch (error) {
          console.error('[Voice] Error restarting recording:', error.message);
          this.isListening = false;
        }
      }
    });

    this.voice.on('error', (event) => {
      console.error(`\n❌ Voice error: ${event.error}\n`);
      if (this.isListening) {
        this.startListening().catch(console.error);
      }
    });

    this.voice.on('listeningEnded', () => {
      this.isListening = false;
      this.log('Listening ended');
    });
  }

  /**
   * Default command handler
   */
  async defaultHandler(command) {
    const cmd = command.toLowerCase().trim();

    if (cmd === 'help') {
      this.printHelp();
    } else if (cmd === 'history') {
      this.printHistory();
    } else if (cmd === 'status') {
      this.printStatus();
    } else if (cmd === 'clear') {
      this.history.clear();
      console.log('✅ History cleared\n');
    } else if (cmd === 'quit' || cmd === 'exit') {
      this.stop();
    } else {
      console.log(`📌 Command: "${command}"`);
      // Route to actual handler
    }
  }

  /**
   * Print help information
   */
  printHelp() {
    console.log(`
📖 Available Commands:
  • help      - Show this help message
  • status    - Show voice module status
  • history   - Show command history
  • clear     - Clear command history
  • quit      - Exit the program

Other commands are sent to the orchestrator.
    `);
  }

  /**
   * Print history
   */
  printHistory() {
    const entries = this.history.getRecent(10);

    if (entries.length === 0) {
      console.log('\n📝 No history yet\n');
      return;
    }

    console.log('\n📝 Command History (last 10):');
    console.log('═'.repeat(60));

    entries.forEach((entry, index) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const conf = (entry.confidence * 100).toFixed(0);
      console.log(`${index + 1}. "${entry.text}" (${conf}% - ${time})`);
    });

    console.log('═'.repeat(60) + '\n');
  }

  /**
   * Print status information
   */
  printStatus() {
    const info = this.voice.getInfo();
    const stats = this.history.getStats();

    console.log(`
📊 Voice Module Status:
  • Supported: ${info.supported ? '✅' : '❌'}
  • State: ${info.state}
  • Language: ${info.config.language}
  • TTS Enabled: ${info.config.ttsEnabled ? '✅' : '❌'}
  • Session ID: ${info.sessionId}

📈 Statistics:
  • Total Commands: ${stats.totalCommands}
  • Successful: ${stats.successfulCommands}
  • Failed: ${stats.failedCommands}
  • Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%
    `);
  }

  /**
   * Stop listening
   */
  stop() {
    this.isListening = false;
    if (this.voice.isRecording()) {
      this.voice.stopRecording();
    }
    console.log('\n👋 Goodbye!\n');
    process.exit(0);
  }

  /**
   * Internal logging
   */
  log(message) {
    console.log(`[Voice] ${message}`);
  }

  /**
   * Get voice module instance
   */
  getVoiceModule() {
    return this.voice;
  }

  /**
   * Get history manager
   */
  getHistory() {
    return this.history;
  }
}

/**
 * Main CLI Demo
 */
async function main() {
  console.log('🎤 Voice Module CLI Integration Example\n');

  // Create handler
  const voiceHandler = new CLIVoiceHandler({
    language: 'en-US',
    ttsEnabled: true,
    commandHandler: async (command) => {
      const cmd = command.toLowerCase().trim();

      if (cmd === 'help') {
        voiceHandler.printHelp();
      } else if (cmd === 'history') {
        voiceHandler.printHistory();
      } else if (cmd === 'status') {
        voiceHandler.printStatus();
      } else if (cmd === 'clear') {
        voiceHandler.history.clear();
        console.log('✅ History cleared\n');
      } else if (cmd === 'quit' || cmd === 'exit') {
        voiceHandler.stop();
      } else {
        console.log(`\n📤 Sending to orchestrator: "${command}"\n`);
        // Here you would send the command to your orchestrator
        // await orchestrator.receiveDirective(command);
      }
    }
  });

  // Check support
  if (!voiceHandler.getVoiceModule().isSupported) {
    console.error('❌ Web Speech API is not supported in this Node.js environment');
    console.error('   Note: Voice module is designed for browser use');
    console.error('   For Node.js, use whisper.cpp or other STT libraries');
    process.exit(1);
  }

  // Show initial help
  voiceHandler.printHelp();

  // Start listening
  try {
    await voiceHandler.startListening();
  } catch (error) {
    console.error('❌ Error starting voice handler:', error.message);
    process.exit(1);
  }

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n');
    voiceHandler.stop();
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CLIVoiceHandler;

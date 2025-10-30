const EventEmitter = require('events');

/**
 * VoiceModule - Core voice input/output functionality
 *
 * Provides unified voice interface with:
 * - Push-to-talk recording
 * - Real-time transcription streaming
 * - Text-to-speech output
 * - Command history tracking
 * - Event-based architecture
 */
class VoiceModule extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      language: options.language || 'en-US',
      continuousRecognition: options.continuous || false,
      interimResults: options.interimResults !== false,
      maxHistory: options.maxHistory || 100,
      confidenceThreshold: options.confidenceThreshold || 0.5,
      autoSendOnFinal: options.autoSendOnFinal !== false,
      ttsEnabled: options.ttsEnabled !== false,
      ...options
    };

    this.state = 'idle'; // idle, recording, processing, speaking
    this.currentTranscript = '';
    this.interimTranscript = '';
    this.history = [];
    this.sessionId = this.generateSessionId();
    this.isSupported = this.checkBrowserSupport();

    // Initialize adapters if in browser environment
    if (typeof window !== 'undefined') {
      this.speechAdapter = null; // Lazy loaded
    }

    this.log('VoiceModule initialized', {
      supported: this.isSupported,
      language: this.config.language,
      ttsEnabled: this.config.ttsEnabled
    });
  }

  /**
   * Check if browser supports Web Speech API
   */
  checkBrowserSupport() {
    if (typeof window === 'undefined') {
      return false; // Node.js environment
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;

    return !!(SpeechRecognition && SpeechSynthesis);
  }

  /**
   * Initialize speech adapter (lazy loading)
   */
  initializeAdapter() {
    if (this.speechAdapter) return this.speechAdapter;

    if (!this.isSupported) {
      throw new Error('Web Speech API not supported in this browser');
    }

    const WebSpeechAdapter = require('./WebSpeechAdapter');
    this.speechAdapter = new WebSpeechAdapter({
      language: this.config.language,
      continuous: this.config.continuousRecognition,
      interimResults: this.config.interimResults,
      onInterimResult: (text) => this.handleInterimTranscript(text),
      onFinalResult: (text, confidence) => this.handleFinalTranscript(text, confidence),
      onError: (error) => this.handleError(error),
      onStart: () => this.handleRecognitionStart(),
      onEnd: () => this.handleRecognitionEnd()
    });

    return this.speechAdapter;
  }

  /**
   * Start recording voice input (push-to-talk)
   */
  async startRecording() {
    if (this.state !== 'idle') {
      this.log('Warning: Already recording or processing');
      return;
    }

    this.setState('recording');
    this.currentTranscript = '';
    this.interimTranscript = '';
    this.emit('recordingStarted');
    this.log('Recording started');

    try {
      const adapter = this.initializeAdapter();
      await adapter.startRecognition();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Stop recording and process transcript
   */
  async stopRecording() {
    if (this.state !== 'recording') {
      this.log('Warning: Not currently recording');
      return;
    }

    this.setState('processing');
    this.log('Recording stopped, processing...');

    try {
      const adapter = this.initializeAdapter();
      await adapter.stopRecognition();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle interim transcription results (real-time display)
   */
  handleInterimTranscript(text) {
    this.interimTranscript = text;
    this.emit('transcribing', {
      interim: text,
      final: this.currentTranscript,
      timestamp: Date.now()
    });
    this.log('Interim transcript:', text);
  }

  /**
   * Handle final transcription result
   */
  handleFinalTranscript(text, confidence = 1.0) {
    // Only accept if confidence meets threshold
    if (confidence < this.config.confidenceThreshold && text.length > 0) {
      this.log('Transcript below confidence threshold, ignoring', {
        text,
        confidence,
        threshold: this.config.confidenceThreshold
      });
      return;
    }

    this.currentTranscript = text;
    this.interimTranscript = '';

    const transcript = {
      id: this.generateId(),
      text: text.trim(),
      confidence: confidence,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      status: 'received'
    };

    // Add to history
    this.addToHistory(transcript);

    this.emit('transcript', transcript);
    this.log('Final transcript received:', {
      text: text.trim(),
      confidence: confidence
    });

    // Auto-send to orchestrator if enabled
    if (this.config.autoSendOnFinal && text.trim().length > 0) {
      this.emit('commandReady', text.trim());
    }
  }

  /**
   * Handle recognition start event
   */
  handleRecognitionStart() {
    this.emit('listeningStarted');
    this.log('Listening started');
  }

  /**
   * Handle recognition end event
   */
  handleRecognitionEnd() {
    this.setState('idle');
    this.emit('listeningEnded');
    this.log('Listening ended');
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text, options = {}) {
    if (!this.config.ttsEnabled) {
      this.log('TTS disabled, skipping speak');
      return;
    }

    if (this.state === 'speaking') {
      this.log('Already speaking, queueing...');
      // Queue the text for after current speech ends
      this.once('speakingEnded', () => this.speak(text, options));
      return;
    }

    this.setState('speaking');

    try {
      const adapter = this.initializeAdapter();
      const utterance = {
        text: text,
        rate: options.rate || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 1.0,
        voice: options.voice || null,
        onEnd: () => {
          this.setState('idle');
          this.emit('speakingEnded');
          this.log('Speech ended');
        },
        onError: (error) => {
          this.setState('idle');
          this.emit('speakingEnded');
          this.handleError(error);
        }
      };

      await adapter.speak(utterance);
      this.emit('speaking', { text: text, options: options });
      this.log('Speaking:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    } catch (error) {
      this.setState('idle');
      this.handleError(error);
    }
  }

  /**
   * Stop text-to-speech
   */
  stopSpeaking() {
    if (this.state !== 'speaking') {
      return;
    }

    try {
      const adapter = this.initializeAdapter();
      adapter.stopSpeaking();
      this.setState('idle');
      this.emit('speakingStopped');
      this.log('Speech stopped');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Add transcript to history
   */
  addToHistory(transcript) {
    this.history.unshift(transcript); // Newest first

    // Trim history to max size
    if (this.history.length > this.config.maxHistory) {
      this.history = this.history.slice(0, this.config.maxHistory);
    }

    this.emit('historyUpdated', this.history);
  }

  /**
   * Get command history
   */
  getHistory(limit = null) {
    if (limit) {
      return this.history.slice(0, limit);
    }
    return [...this.history];
  }

  /**
   * Get history for a specific session
   */
  getSessionHistory() {
    return this.history.filter(item => item.sessionId === this.sessionId);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
    this.emit('historyCleared');
    this.log('History cleared');
  }

  /**
   * Update transcript status (e.g., 'sent', 'failed', 'executed')
   */
  updateTranscriptStatus(id, status, metadata = {}) {
    const transcript = this.history.find(t => t.id === id);
    if (transcript) {
      transcript.status = status;
      transcript.metadata = { ...transcript.metadata, ...metadata };
      this.emit('historyUpdated', this.history);
    }
  }

  /**
   * Set language for recognition
   */
  setLanguage(language) {
    this.config.language = language;
    if (this.speechAdapter) {
      this.speechAdapter.setLanguage(language);
    }
    this.emit('languageChanged', language);
    this.log('Language set to:', language);
  }

  /**
   * Get available voices for TTS
   */
  getAvailableVoices() {
    if (!this.isSupported) {
      return [];
    }

    try {
      const adapter = this.initializeAdapter();
      return adapter.getAvailableVoices();
    } catch (error) {
      this.log('Error getting voices:', error.message);
      return [];
    }
  }

  /**
   * Set TTS voice
   */
  setVoice(voiceIndex) {
    try {
      const adapter = this.initializeAdapter();
      adapter.setVoice(voiceIndex);
      this.log('Voice set to index:', voiceIndex);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle errors
   */
  handleError(error) {
    this.setState('idle');
    const errorEvent = {
      error: error.message || String(error),
      timestamp: Date.now(),
      state: this.state
    };

    this.emit('error', errorEvent);
    this.log('Error:', error.message || error);
  }

  /**
   * Update internal state and emit event
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.emit('stateChanged', { oldState, newState });
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if recording is active
   */
  isRecording() {
    return this.state === 'recording';
  }

  /**
   * Check if speaking is active
   */
  isSpeaking() {
    return this.state === 'speaking';
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${this.sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Internal logging
   */
  log(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[VoiceModule] ${timestamp} ${message}`, data);
    } else {
      console.log(`[VoiceModule] ${timestamp} ${message}`);
    }
    this.emit('log', { message, data, timestamp });
  }

  /**
   * Get module info
   */
  getInfo() {
    return {
      supported: this.isSupported,
      state: this.state,
      sessionId: this.sessionId,
      config: { ...this.config },
      historySize: this.history.length,
      hasAdapter: !!this.speechAdapter
    };
  }

  /**
   * Enable/disable module
   */
  setEnabled(enabled) {
    if (enabled && !this.isSupported) {
      throw new Error('Web Speech API not supported');
    }
    this.config.enabled = enabled;
  }

  /**
   * Reset module state
   */
  reset() {
    this.state = 'idle';
    this.currentTranscript = '';
    this.interimTranscript = '';
    this.sessionId = this.generateSessionId();
    this.emit('reset');
    this.log('Module reset');
  }
}

module.exports = VoiceModule;

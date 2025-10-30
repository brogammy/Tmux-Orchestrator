/**
 * Dashboard Voice UI Handler
 *
 * Integrates VoiceModule with the dashboard interface
 * Handles voice button interactions, real-time transcription display, and history
 */

class DashboardVoiceUI {
  constructor(options = {}) {
    this.voiceModule = options.voiceModule;
    this.commandHandler = options.commandHandler || ((text) => console.log('Command:', text));
    this.config = {
      buttonSelector: options.buttonSelector || '.voice-btn',
      transcriptionDisplay: options.transcriptionDisplay || '.transcription-display',
      historyDisplay: options.historyDisplay || '.voice-history',
      indicatorSelector: options.indicatorSelector || '.voice-indicator',
      ...options
    };

    this.isInitialized = false;
    this.currentSessionId = null;

    if (!this.voiceModule) {
      console.error('DashboardVoiceUI: voiceModule is required');
      return;
    }

    this.init();
  }

  /**
   * Initialize the UI
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Setup voice module listeners
    this.setupVoiceModuleListeners();

    // Update UI state
    this.updateUIState();

    this.isInitialized = true;
    console.log('[DashboardVoiceUI] Initialized');
  }

  /**
   * Setup DOM event listeners
   */
  setupEventListeners() {
    // Voice button click
    const voiceBtn = document.querySelector(this.config.buttonSelector);
    if (voiceBtn) {
      voiceBtn.addEventListener('click', (e) => this.handleVoiceButtonClick(e));
    }

    // Clear history button
    const clearHistoryBtn = document.querySelector('.clear-voice-history');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    // Language selector
    const languageSelect = document.querySelector('.voice-language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
    }

    // TTS enable toggle
    const ttToggle = document.querySelector('.voice-tts-toggle');
    if (ttToggle) {
      ttToggle.addEventListener('change', (e) => this.setTTSEnabled(e.target.checked));
    }
  }

  /**
   * Setup VoiceModule event listeners
   */
  setupVoiceModuleListeners() {
    // Recording started
    this.voiceModule.on('recordingStarted', () => {
      this.setUIState('recording');
      this.updateIndicator('Recording...', 'recording');
    });

    // Recording stopped
    this.voiceModule.on('recordingEnded', () => {
      this.setUIState('processing');
      this.updateIndicator('Processing...', 'processing');
    });

    // Real-time transcription
    this.voiceModule.on('transcribing', (event) => {
      this.displayTranscription(event.interim, event.final);
    });

    // Final transcript
    this.voiceModule.on('transcript', (transcript) => {
      this.handleTranscript(transcript);
    });

    // Speaking
    this.voiceModule.on('speaking', (event) => {
      this.setUIState('speaking');
      this.updateIndicator('Speaking...', 'speaking');
    });

    // Listening ended
    this.voiceModule.on('listeningEnded', () => {
      this.setUIState('idle');
      this.updateIndicator('Ready', 'ready');
    });

    // Speaking ended
    this.voiceModule.on('speakingEnded', () => {
      this.setUIState('idle');
      this.updateIndicator('Ready', 'ready');
    });

    // State changed
    this.voiceModule.on('stateChanged', (event) => {
      console.log('[Voice] State changed:', event.oldState, '→', event.newState);
    });

    // Error
    this.voiceModule.on('error', (event) => {
      this.handleError(event);
    });

    // History updated
    this.voiceModule.on('historyUpdated', (history) => {
      this.updateHistoryDisplay(history);
    });
  }

  /**
   * Handle voice button click
   */
  async handleVoiceButtonClick(event) {
    event.preventDefault();

    const state = this.voiceModule.getState();

    if (state === 'idle') {
      // Start recording
      try {
        await this.voiceModule.startRecording();
      } catch (error) {
        this.handleError(error);
      }
    } else if (state === 'recording') {
      // Stop recording
      try {
        await this.voiceModule.stopRecording();
      } catch (error) {
        this.handleError(error);
      }
    }
  }

  /**
   * Display real-time transcription
   */
  displayTranscription(interim, final) {
    const display = document.querySelector(this.config.transcriptionDisplay);
    if (!display) {
      return;
    }

    let html = '';

    if (final) {
      html += `<div class="final-transcript">${this.escapeHtml(final)}</div>`;
    }

    if (interim) {
      html += `<div class="interim-transcript"><em>${this.escapeHtml(interim)}</em></div>`;
    }

    display.innerHTML = html;
  }

  /**
   * Handle received transcript
   */
  async handleTranscript(transcript) {
    const display = document.querySelector(this.config.transcriptionDisplay);
    if (display) {
      display.innerHTML = `<div class="transcript-result">
        <span class="text">${this.escapeHtml(transcript.text)}</span>
        <span class="confidence">${(transcript.confidence * 100).toFixed(0)}%</span>
      </div>`;
    }

    // Send command to handler
    if (transcript.text.trim().length > 0) {
      try {
        await this.commandHandler(transcript.text);

        // Update status to sent
        this.voiceModule.updateTranscriptStatus(transcript.id, 'sent', {
          sentAt: Date.now()
        });

        // Speak confirmation
        if (this.voiceModule.config.ttsEnabled) {
          this.voiceModule.speak('Command received and processing.');
        }
      } catch (error) {
        console.error('Error handling transcript:', error);

        // Update status to failed
        this.voiceModule.updateTranscriptStatus(transcript.id, 'failed', {
          error: error.message
        });

        // Speak error
        if (this.voiceModule.config.ttsEnabled) {
          this.voiceModule.speak('Sorry, an error occurred processing your command.');
        }
      }
    }
  }

  /**
   * Handle errors
   */
  handleError(event) {
    console.error('[DashboardVoiceUI] Error:', event);

    const display = document.querySelector(this.config.transcriptionDisplay);
    if (display) {
      display.innerHTML = `<div class="error-message">Error: ${this.escapeHtml(event.error)}</div>`;
    }

    this.updateIndicator('Error: ' + event.error, 'error');

    // Speak error message
    if (this.voiceModule.config.ttsEnabled) {
      const errorMessage = this.getErrorMessage(event.error);
      this.voiceModule.speak(errorMessage);
    }

    this.setUIState('idle');
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorCode) {
    const messages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio': 'Microphone error. Please check your microphone.',
      'network': 'Network error. Please check your connection.',
      'service-not-allowed': 'Speech recognition is not allowed.',
      'bad-grammar': 'Grammar error. Please try again.',
      'abort': 'Recognition was interrupted.'
    };

    return messages[errorCode] || 'An error occurred. Please try again.';
  }

  /**
   * Update transcription display
   */
  updateHistoryDisplay(history) {
    const historyDisplay = document.querySelector(this.config.historyDisplay);
    if (!historyDisplay) {
      return;
    }

    const limit = 5; // Show last 5 commands
    const recent = history.slice(0, limit);

    if (recent.length === 0) {
      historyDisplay.innerHTML = '<p class="empty">No voice commands yet</p>';
      return;
    }

    const html = recent
      .map(
        (item) => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-text">${this.escapeHtml(item.text)}</div>
        <div class="history-meta">
          <span class="status" data-status="${item.status}">${item.status}</span>
          <span class="confidence">${(item.confidence * 100).toFixed(0)}%</span>
          <span class="time">${new Date(item.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    `
      )
      .join('');

    historyDisplay.innerHTML = html;
  }

  /**
   * Update UI indicator
   */
  updateIndicator(text, state) {
    const indicator = document.querySelector(this.config.indicatorSelector);
    if (indicator) {
      indicator.textContent = text;
      indicator.className = `voice-indicator state-${state}`;
    }
  }

  /**
   * Set UI state (updates button visibility/state)
   */
  setUIState(state) {
    const voiceBtn = document.querySelector(this.config.buttonSelector);
    if (!voiceBtn) {
      return;
    }

    voiceBtn.classList.remove('recording', 'processing', 'speaking', 'idle');
    voiceBtn.classList.add(state);

    // Update button text
    const states = {
      idle: '🎤 Speak',
      recording: '⏹️ Stop',
      processing: '⏳ Processing...',
      speaking: '🔊 Speaking...'
    };

    voiceBtn.textContent = states[state] || 'Speak';
  }

  /**
   * Update entire UI state
   */
  updateUIState() {
    const state = this.voiceModule.getState();
    this.setUIState(state);
    this.updateIndicator('Ready', 'ready');
    this.updateHistoryDisplay(this.voiceModule.getHistory());
  }

  /**
   * Change language
   */
  changeLanguage(language) {
    this.voiceModule.setLanguage(language);
    console.log('[DashboardVoiceUI] Language changed to:', language);
  }

  /**
   * Set TTS enabled/disabled
   */
  setTTSEnabled(enabled) {
    this.voiceModule.config.ttsEnabled = enabled;
    console.log('[DashboardVoiceUI] TTS enabled:', enabled);
  }

  /**
   * Clear history
   */
  clearHistory() {
    if (confirm('Clear all voice command history?')) {
      this.voiceModule.clearHistory();
      this.updateHistoryDisplay([]);
      console.log('[DashboardVoiceUI] History cleared');
    }
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get module info
   */
  getInfo() {
    return {
      isInitialized: this.isInitialized,
      voiceModuleInfo: this.voiceModule.getInfo(),
      config: this.config
    };
  }

  /**
   * Destroy UI (cleanup)
   */
  destroy() {
    if (!this.isInitialized) {
      return;
    }

    // Remove event listeners
    const voiceBtn = document.querySelector(this.config.buttonSelector);
    if (voiceBtn) {
      voiceBtn.replaceWith(voiceBtn.cloneNode(true));
    }

    this.isInitialized = false;
    console.log('[DashboardVoiceUI] Destroyed');
  }
}

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardVoiceUI;
}

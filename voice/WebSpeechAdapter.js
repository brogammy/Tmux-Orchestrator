/**
 * WebSpeechAdapter - Wrapper for Web Speech API (SpeechRecognition + SpeechSynthesis)
 *
 * Handles browser-specific implementations and edge cases:
 * - Chrome: Full support
 * - Firefox: Synthesis only
 * - Safari: Limited support
 * - Edge: Full support
 */
class WebSpeechAdapter {
  constructor(options = {}) {
    this.language = options.language || 'en-US';
    this.continuous = options.continuous || false;
    this.interimResults = options.interimResults !== false;
    this.maxAlternatives = options.maxAlternatives || 1;

    // Callbacks
    this.onInterimResult = options.onInterimResult || (() => {});
    this.onFinalResult = options.onFinalResult || (() => {});
    this.onError = options.onError || (() => {});
    this.onStart = options.onStart || (() => {});
    this.onEnd = options.onEnd || (() => {});

    // Check browser support
    this.SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    this.SpeechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

    this.recognition = null;
    this.recognitionActive = false;
    this.currentUtterance = null;
    this.voices = [];
    this.selectedVoiceIndex = 0;

    if (!this.SpeechRecognition || !this.SpeechSynthesis) {
      console.warn('Web Speech API not fully supported in this browser');
    }

    this.initializeRecognition();
    this.loadVoices();
  }

  /**
   * Initialize speech recognition
   */
  initializeRecognition() {
    if (!this.SpeechRecognition) {
      return;
    }

    this.recognition = new this.SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = this.continuous;
    this.recognition.interimResults = this.interimResults;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = this.maxAlternatives;

    // Set up event handlers
    this.recognition.onstart = () => {
      this.recognitionActive = true;
      this.onStart();
    };

    this.recognition.onend = () => {
      this.recognitionActive = false;
      this.onEnd();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let lastConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          lastConfidence = confidence;
        } else {
          interimTranscript += transcript;
        }
      }

      // Report interim results (real-time)
      if (interimTranscript) {
        this.onInterimResult(interimTranscript);
      }

      // Report final results
      if (finalTranscript) {
        finalTranscript = finalTranscript.trim();
        this.onFinalResult(finalTranscript, lastConfidence);
      }
    };

    this.recognition.onerror = (event) => {
      const errorMap = {
        'network': 'Network error occurred',
        'audio': 'Audio capture error',
        'abort': 'Recognition aborted',
        'service-not-allowed': 'Speech recognition service not allowed',
        'bad-grammar': 'Grammar error',
        'no-speech': 'No speech detected',
        'internal-error': 'Internal error occurred'
      };

      const errorMessage = errorMap[event.error] || `Unknown error: ${event.error}`;
      const error = new Error(errorMessage);
      error.code = event.error;
      this.onError(error);
    };
  }

  /**
   * Start recognition
   */
  startRecognition() {
    return new Promise((resolve, reject) => {
      if (!this.SpeechRecognition) {
        reject(new Error('Speech Recognition not supported'));
        return;
      }

      if (this.recognitionActive) {
        reject(new Error('Recognition already active'));
        return;
      }

      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop recognition
   */
  stopRecognition() {
    return new Promise((resolve, reject) => {
      if (!this.recognition || !this.recognitionActive) {
        reject(new Error('Recognition not active'));
        return;
      }

      try {
        this.recognition.stop();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Abort recognition
   */
  abortRecognition() {
    if (this.recognition && this.recognitionActive) {
      this.recognition.abort();
    }
  }

  /**
   * Load available voices for TTS
   */
  loadVoices() {
    if (!this.SpeechSynthesis) {
      return;
    }

    // Voices might not be loaded immediately
    const loadVoices = () => {
      this.voices = this.SpeechSynthesis.getVoices();
    };

    // Try to load voices immediately
    loadVoices();

    // Also listen for voiceschanged event (important for some browsers)
    if ('onvoiceschanged' in this.SpeechSynthesis) {
      this.SpeechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Speak text using text-to-speech
   */
  speak(utteranceConfig) {
    return new Promise((resolve, reject) => {
      if (!this.SpeechSynthesis) {
        reject(new Error('Speech Synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.SpeechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(utteranceConfig.text);

      // Set voice if specified
      if (utteranceConfig.voice !== null && this.voices.length > 0) {
        const voiceIndex = Math.min(
          utteranceConfig.voice || this.selectedVoiceIndex,
          this.voices.length - 1
        );
        utterance.voice = this.voices[voiceIndex];
      }

      // Set speech parameters
      utterance.rate = utteranceConfig.rate || 1.0;
      utterance.pitch = utteranceConfig.pitch || 1.0;
      utterance.volume = utteranceConfig.volume || 1.0;

      // Set up event handlers
      utterance.onstart = () => {
        // Speech started
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (utteranceConfig.onEnd) {
          utteranceConfig.onEnd();
        }
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        const error = new Error(`Speech synthesis error: ${event.error}`);
        if (utteranceConfig.onError) {
          utteranceConfig.onError(error);
        }
        reject(error);
      };

      this.currentUtterance = utterance;

      try {
        this.SpeechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop text-to-speech
   */
  stopSpeaking() {
    if (this.SpeechSynthesis) {
      this.SpeechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking() {
    return this.SpeechSynthesis && this.SpeechSynthesis.speaking;
  }

  /**
   * Get available voices
   */
  getAvailableVoices() {
    return this.voices.map((voice, index) => ({
      index: index,
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
      localService: voice.localService
    }));
  }

  /**
   * Set voice by index
   */
  setVoice(voiceIndex) {
    if (voiceIndex >= 0 && voiceIndex < this.voices.length) {
      this.selectedVoiceIndex = voiceIndex;
    }
  }

  /**
   * Get selected voice info
   */
  getSelectedVoice() {
    if (this.voices.length === 0) {
      return null;
    }

    const voice = this.voices[this.selectedVoiceIndex];
    return {
      index: this.selectedVoiceIndex,
      name: voice.name,
      lang: voice.lang
    };
  }

  /**
   * Set recognition language
   */
  setLanguage(language) {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Check if recognition is active
   */
  isRecognitionActive() {
    return this.recognitionActive;
  }

  /**
   * Get browser support info
   */
  getSupportInfo() {
    return {
      recognition: !!this.SpeechRecognition,
      synthesis: !!this.SpeechSynthesis,
      voicesAvailable: this.voices.length,
      language: this.language,
      continuous: this.continuous,
      interimResults: this.interimResults
    };
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSpeechAdapter;
}

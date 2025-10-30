/**
 * Voice Module Configuration
 *
 * Default settings for VoiceModule behavior
 */

module.exports = {
  // Recognition settings
  recognition: {
    language: 'en-US',
    continuous: false,
    interimResults: true,
    maxAlternatives: 1,
    confidenceThreshold: 0.5
  },

  // Synthesis settings (text-to-speech)
  synthesis: {
    rate: 1.0, // 0.1 to 10
    pitch: 1.0, // 0 to 2
    volume: 1.0, // 0 to 1
    voiceIndex: 0
  },

  // Module behavior
  module: {
    autoSendOnFinal: true, // Auto-send transcript when final result received
    maxHistory: 100, // Maximum history entries to keep
    ttsEnabled: true, // Enable text-to-speech
    loggingEnabled: true // Enable console logging
  },

  // Storage settings
  storage: {
    persistence: null, // 'localStorage', 'file', or null
    persistenceKey: 'voiceHistory', // localStorage key or file path
    maxHistorySize: 500 // Maximum size of stored history
  },

  // UI settings
  ui: {
    indicatorClass: 'voice-indicator', // CSS class for visual indicators
    buttonSelector: '.voice-btn', // CSS selector for voice button
    transcriptionDisplay: '.transcription', // Element to display transcription
    historyDisplay: '.voice-history', // Element to display history
    showInterimResults: true, // Show text while speaking
    autoFocusOnStart: true // Focus transcription field when started
  },

  // Supported languages
  supportedLanguages: [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'zh-CN', name: 'Mandarin (China)' },
    { code: 'zh-TW', name: 'Mandarin (Taiwan)' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ru-RU', name: 'Russian' }
  ],

  // Error handling
  errors: {
    'no-speech': {
      message: 'No speech detected. Please try again.',
      recoverable: true
    },
    'audio': {
      message: 'Audio capture failed. Check microphone.',
      recoverable: false
    },
    'network': {
      message: 'Network error. Check your connection.',
      recoverable: true
    },
    'service-not-allowed': {
      message: 'Speech recognition service not allowed.',
      recoverable: false
    },
    'bad-grammar': {
      message: 'Grammar error in recognition.',
      recoverable: true
    },
    'abort': {
      message: 'Recognition was aborted.',
      recoverable: true
    }
  },

  // Timeout settings (milliseconds)
  timeouts: {
    recognitionTimeout: 30000, // Max recognition duration
    speakingTimeout: 60000, // Max TTS duration
    historyLoadTimeout: 5000 // Max history load time
  }
};

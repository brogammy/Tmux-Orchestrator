/**
 * Voice Module Exports
 *
 * Main entry point for the voice module
 */

const VoiceModule = require('./VoiceModule');
const WebSpeechAdapter = require('./WebSpeechAdapter');
const VoiceHistory = require('./VoiceHistory');
const config = require('./config');

/**
 * Factory function to create a new voice instance
 */
function createVoiceModule(options = {}) {
  const mergedOptions = {
    ...config.module,
    ...config.recognition,
    ...config.synthesis,
    ...options
  };

  return new VoiceModule(mergedOptions);
}

/**
 * Factory function to create a new voice history instance
 */
function createVoiceHistory(options = {}) {
  const mergedOptions = {
    ...config.storage,
    ...options
  };

  return new VoiceHistory(mergedOptions);
}

module.exports = {
  // Classes
  VoiceModule,
  WebSpeechAdapter,
  VoiceHistory,

  // Factory functions
  createVoiceModule,
  createVoiceHistory,

  // Configuration
  config,

  // Version
  version: '1.0.0'
};

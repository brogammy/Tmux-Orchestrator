/**
 * VoiceHistory - Manage voice command history
 *
 * Features:
 * - Store transcriptions with metadata
 * - Filter by status, session, date range
 * - Export/import history
 * - Persistence to localStorage (browser) or file (Node.js)
 */
class VoiceHistory {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 500;
    this.persistence = options.persistence || null; // 'localStorage', 'file', or null
    this.persistenceKey = options.persistenceKey || 'voiceHistory';
    this.history = [];
    this.stats = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageConfidence: 0
    };

    this.loadFromStorage();
    this.updateStats();
  }

  /**
   * Add entry to history
   */
  add(entry) {
    const historicalEntry = {
      id: entry.id,
      text: entry.text,
      confidence: entry.confidence,
      timestamp: entry.timestamp,
      sessionId: entry.sessionId,
      status: entry.status || 'received',
      metadata: entry.metadata || {}
    };

    this.history.unshift(historicalEntry);

    // Maintain max size
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(0, this.maxSize);
    }

    this.updateStats();
    this.saveToStorage();

    return historicalEntry;
  }

  /**
   * Update entry status
   */
  updateStatus(id, status, metadata = {}) {
    const entry = this.history.find(e => e.id === id);
    if (entry) {
      entry.status = status;
      entry.metadata = { ...entry.metadata, ...metadata };
      this.updateStats();
      this.saveToStorage();
      return entry;
    }
    return null;
  }

  /**
   * Get entry by ID
   */
  getById(id) {
    return this.history.find(e => e.id === id);
  }

  /**
   * Get all entries
   */
  getAll() {
    return [...this.history];
  }

  /**
   * Get entries with limit
   */
  getRecent(limit = 10) {
    return this.history.slice(0, Math.min(limit, this.history.length));
  }

  /**
   * Filter entries by status
   */
  getByStatus(status) {
    return this.history.filter(e => e.status === status);
  }

  /**
   * Filter entries by session
   */
  getBySession(sessionId) {
    return this.history.filter(e => e.sessionId === sessionId);
  }

  /**
   * Filter entries by date range
   */
  getByDateRange(startTime, endTime) {
    return this.history.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  /**
   * Filter entries by confidence threshold
   */
  getByConfidence(minConfidence = 0.5) {
    return this.history.filter(e => e.confidence >= minConfidence);
  }

  /**
   * Search entries by text
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(e => e.text.toLowerCase().includes(lowerQuery));
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  updateStats() {
    const total = this.history.length;
    const successful = this.history.filter(e => e.status === 'sent' || e.status === 'executed')
      .length;
    const failed = this.history.filter(e => e.status === 'failed').length;

    const confidences = this.history.map(e => e.confidence);
    const avgConfidence =
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

    this.stats = {
      totalCommands: total,
      successfulCommands: successful,
      failedCommands: failed,
      averageConfidence: parseFloat(avgConfidence.toFixed(3))
    };
  }

  /**
   * Clear all history
   */
  clear() {
    this.history = [];
    this.updateStats();
    this.saveToStorage();
  }

  /**
   * Export history as JSON
   */
  export() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      stats: this.stats,
      entries: this.history
    };
  }

  /**
   * Import history from JSON
   */
  import(data) {
    if (!data.entries || !Array.isArray(data.entries)) {
      throw new Error('Invalid import data format');
    }

    // Merge with existing history, avoiding duplicates
    const existingIds = new Set(this.history.map(e => e.id));
    const newEntries = data.entries.filter(e => !existingIds.has(e.id));

    this.history = [...newEntries, ...this.history];

    // Maintain max size
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(0, this.maxSize);
    }

    this.updateStats();
    this.saveToStorage();

    return newEntries.length;
  }

  /**
   * Get summary for a session
   */
  getSessionSummary(sessionId) {
    const entries = this.getBySession(sessionId);
    return {
      sessionId: sessionId,
      commandCount: entries.length,
      successCount: entries.filter(e => e.status === 'sent' || e.status === 'executed').length,
      failCount: entries.filter(e => e.status === 'failed').length,
      averageConfidence:
        entries.length > 0
          ? (entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length).toFixed(3)
          : 0,
      startTime: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null,
      endTime: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : null,
      entries: entries
    };
  }

  /**
   * Get all unique sessions
   */
  getSessions() {
    const sessions = new Set(this.history.map(e => e.sessionId));
    return Array.from(sessions);
  }

  /**
   * Remove entry by ID
   */
  removeById(id) {
    const index = this.history.findIndex(e => e.id === id);
    if (index !== -1) {
      this.history.splice(index, 1);
      this.updateStats();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Remove entries older than specified time
   */
  removeOlderThan(timestamp) {
    const initialLength = this.history.length;
    this.history = this.history.filter(e => e.timestamp > timestamp);
    const removed = initialLength - this.history.length;
    this.updateStats();
    this.saveToStorage();
    return removed;
  }

  /**
   * Save to storage (localStorage or file)
   */
  saveToStorage() {
    if (!this.persistence) {
      return;
    }

    try {
      const data = JSON.stringify(this.export());

      if (this.persistence === 'localStorage' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.persistenceKey, data);
      } else if (this.persistence === 'file') {
        // Node.js file persistence
        const fs = require('fs');
        const path = require('path');
        const dir = path.dirname(this.persistenceKey);

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(this.persistenceKey, data, 'utf-8');
      }
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  /**
   * Load from storage (localStorage or file)
   */
  loadFromStorage() {
    if (!this.persistence) {
      return;
    }

    try {
      let data = null;

      if (this.persistence === 'localStorage' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.persistenceKey);
        if (stored) {
          data = JSON.parse(stored);
        }
      } else if (this.persistence === 'file') {
        // Node.js file persistence
        const fs = require('fs');
        if (fs.existsSync(this.persistenceKey)) {
          const content = fs.readFileSync(this.persistenceKey, 'utf-8');
          data = JSON.parse(content);
        }
      }

      if (data && data.entries) {
        this.history = data.entries;
        this.updateStats();
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  /**
   * Get size in bytes (approximate)
   */
  getSizeInBytes() {
    return JSON.stringify(this.export()).length;
  }

  /**
   * Format history as table (for CLI display)
   */
  formatAsTable(limit = 10) {
    const entries = this.getRecent(limit);
    return entries.map(e => ({
      id: e.id.substring(0, 8),
      text: e.text.substring(0, 50),
      confidence: (e.confidence * 100).toFixed(0) + '%',
      status: e.status,
      timestamp: new Date(e.timestamp).toLocaleString()
    }));
  }
}

module.exports = VoiceHistory;

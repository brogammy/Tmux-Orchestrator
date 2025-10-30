// OpenCodeAgent - Wrapper for agent execution with OpenCode integration
// Handles both paid (Claude) and free (OpenCode) models with automatic fallback
// Supports model switching and rate limit handling

import { createOpencodeClient } from '@opencode-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OpenCodeAgent {
  constructor(agentName, configPath = null) {
    this.agentName = agentName;
    this.configPath = configPath || path.join(__dirname, '../config/agent-config.json');
    this.config = null;
    this.agentConfig = null;
    this.opencodeClient = null;
    this.sessionId = null;
    this.currentModel = null;
    this.executionHistory = [];
    this.fallbackCount = 0;
  }

  // Initialize the agent with configuration
  async initialize() {
    // Load configuration
    const configData = await fs.readFile(this.configPath, 'utf-8');
    this.config = JSON.parse(configData);

    // Get agent-specific configuration
    this.agentConfig = this.config.agentConfigs[this.agentName];
    if (!this.agentConfig) {
      throw new Error(`No configuration found for agent: ${this.agentName}`);
    }

    // Connect to OpenCode server
    this.opencodeClient = createOpencodeClient({
      baseUrl: process.env.OPENCODE_URL || 'http://localhost:4096'
    });

    // Set primary model
    this.currentModel = this.agentConfig.primaryModel;

    console.log(`✅ [${this.agentName}] Initialized with model: ${this.currentModel} ${this.getModelTag()}`);
  }

  // Get model tier tag (free) or (paid)
  getModelTag() {
    const modelConfig = this.config.models[this.currentModel];
    return modelConfig ? `(${modelConfig.tier})` : '';
  }

  // Get current model information
  getModelInfo() {
    return this.config.models[this.currentModel];
  }

  // Create or get session
  async ensureSession() {
    if (this.sessionId) {
      return this.sessionId;
    }

    try {
      const session = await this.opencodeClient.session.create({
        body: {
          title: `${this.agentName} Session`,
          model: this.getCurrentModelName()
        }
      });

      this.sessionId = session.data?.id || session.id || session.sessionId;
      console.log(`📝 [${this.agentName}] Created session: ${this.sessionId}`);
      return this.sessionId;
    } catch (error) {
      console.error(`❌ [${this.agentName}] Failed to create session:`, error.message);
      throw error;
    }
  }

  // Get the actual model name for the provider
  getCurrentModelName() {
    const modelInfo = this.getModelInfo();
    return modelInfo.model;
  }

  // Execute a prompt with automatic fallback
  // Supports overriding model per execution for task-specific optimization
  async execute(prompt, options = {}) {
    const startTime = Date.now();

    // Allow Project Manager to override model for this specific task
    const modelToUse = options.model || this.currentModel;

    const execution = {
      agentName: this.agentName,
      prompt,
      model: modelToUse,
      modelTag: this.getModelTagForModel(modelToUse),
      timestamp: new Date().toISOString(),
      success: false,
      fallbackUsed: false,
      attempts: [],
      taskOptimized: !!options.model
    };

    try {
      // Try specified or primary model
      const result = await this.executeWithModel(modelToUse, prompt, options);
      execution.success = true;
      execution.result = result;
      execution.duration = Date.now() - startTime;

    } catch (error) {
      execution.attempts.push({
        model: this.currentModel,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      // Try fallback if enabled
      if (this.agentConfig.allowFallback && this.isRateLimitError(error)) {
        console.log(`⚠️  [${this.agentName}] Rate limit hit, trying fallback models...`);

        for (const fallbackModel of this.agentConfig.fallbackModels) {
          try {
            console.log(`🔄 [${this.agentName}] Attempting with ${fallbackModel} ${this.getModelTagForModel(fallbackModel)}`);

            const result = await this.executeWithModel(fallbackModel, prompt, options);

            execution.success = true;
            execution.fallbackUsed = true;
            execution.fallbackModel = fallbackModel;
            execution.result = result;
            execution.duration = Date.now() - startTime;

            this.fallbackCount++;
            console.log(`✅ [${this.agentName}] Fallback successful with ${fallbackModel}`);
            break;

          } catch (fallbackError) {
            execution.attempts.push({
              model: fallbackModel,
              error: fallbackError.message,
              timestamp: new Date().toISOString()
            });
            console.log(`❌ [${this.agentName}] Fallback ${fallbackModel} failed:`, fallbackError.message);
          }
        }
      }

      if (!execution.success) {
        execution.error = error.message;
        throw error;
      }
    }

    // Store execution history
    this.executionHistory.push(execution);

    return execution.result;
  }

  // Execute with a specific model
  async executeWithModel(modelName, prompt, options = {}) {
    await this.ensureSession();

    const modelInfo = this.config.models[modelName];
    if (!modelInfo) {
      throw new Error(`Model ${modelName} not found in configuration`);
    }

    // Build full prompt with system message
    const fullPrompt = `${this.agentConfig.systemPrompt}\n\n${prompt}`;

    // Use OpenCode for free models, Claude API for paid models
    if (modelInfo.tier === 'free') {
      return await this.executeWithOpenCode(modelInfo, fullPrompt, options);
    } else {
      return await this.executeWithClaude(modelInfo, fullPrompt, options);
    }
  }

  // Execute with OpenCode (free models)
  async executeWithOpenCode(modelInfo, prompt, options) {
    try {
      const response = await this.opencodeClient.session.prompt({
        path: { id: this.sessionId },
        body: {
          parts: [{ type: 'text', text: prompt }],
          model: modelInfo.model,
          ...options
        }
      });

      return this.parseResponse(response);
    } catch (error) {
      throw new Error(`OpenCode execution failed: ${error.message}`);
    }
  }

  // Execute with Claude API (paid models)
  async executeWithClaude(modelInfo, prompt, options) {
    // This would integrate with Claude API
    // For now, fallback to OpenCode with Claude model if available
    try {
      const response = await this.opencodeClient.session.prompt({
        path: { id: this.sessionId },
        body: {
          parts: [{ type: 'text', text: prompt }],
          model: modelInfo.model,
          provider: modelInfo.provider,
          ...options
        }
      });

      return this.parseResponse(response);
    } catch (error) {
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        throw error; // Let fallback mechanism handle it
      }
      throw new Error(`Claude execution failed: ${error.message}`);
    }
  }

  // Parse response from OpenCode
  parseResponse(response) {
    if (response.parts && response.parts.length > 0) {
      return response.parts[0].text;
    }
    if (response.content) {
      return response.content;
    }
    if (typeof response === 'string') {
      return response;
    }
    return JSON.stringify(response);
  }

  // Check if error is rate limit related
  isRateLimitError(error) {
    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('rate limit') ||
           errorMessage.includes('429') ||
           errorMessage.includes('too many requests') ||
           errorMessage.includes('quota exceeded');
  }

  // Get model tag for a specific model
  getModelTagForModel(modelName) {
    const modelConfig = this.config.models[modelName];
    return modelConfig ? `(${modelConfig.tier})` : '';
  }

  // Switch to a different model
  async switchModel(modelName) {
    if (!this.config.models[modelName]) {
      throw new Error(`Model ${modelName} not found in configuration`);
    }

    this.currentModel = modelName;
    console.log(`🔄 [${this.agentName}] Switched to model: ${modelName} ${this.getModelTag()}`);
  }

  // Recommend best model for a specific task based on requirements
  recommendModelForTask(taskDescription, preferences = {}) {
    const taskLower = taskDescription.toLowerCase();
    const scores = new Map();

    // Analyze task requirements
    const needsReasoning = taskLower.includes('plan') || taskLower.includes('architect') ||
                          taskLower.includes('design') || taskLower.includes('analyze');
    const needsSpeed = taskLower.includes('quick') || taskLower.includes('fast') ||
                      taskLower.includes('simple');
    const needsCoding = taskLower.includes('code') || taskLower.includes('implement') ||
                       taskLower.includes('function') || taskLower.includes('class');
    const isComplex = taskDescription.length > 200 || taskLower.includes('complex');

    // Score each model
    for (const [modelName, modelInfo] of Object.entries(this.config.models)) {
      let score = 0;

      // Capability matching
      if (needsCoding && modelInfo.capabilities.includes('coding')) {
        score += 5;
      }
      if (needsReasoning && modelInfo.capabilities.includes('reasoning')) {
        score += 4;
      }
      if (needsSpeed && modelInfo.capabilities.includes('fast-responses')) {
        score += 3;
      }

      // Complexity matching
      if (isComplex && modelInfo.tier === 'paid') {
        score += 3;
      } else if (!isComplex && modelInfo.tier === 'free') {
        score += 2;
      }

      // Preferences
      if (preferences.preferFree && modelInfo.tier === 'free') {
        score += 5;
      }
      if (preferences.preferPaid && modelInfo.tier === 'paid') {
        score += 5;
      }

      scores.set(modelName, score);
    }

    // Return highest scoring model
    const sortedScores = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1]);

    const [bestModel, bestScore] = sortedScores[0];

    return {
      recommendedModel: bestModel,
      score: bestScore,
      modelInfo: this.config.models[bestModel],
      alternatives: sortedScores.slice(1, 4).map(([model, score]) => ({
        model,
        score,
        tag: this.getModelTagForModel(model)
      }))
    };
  }

  // Get agent statistics
  getStats() {
    const successfulExecutions = this.executionHistory.filter(e => e.success).length;
    const fallbackExecutions = this.executionHistory.filter(e => e.fallbackUsed).length;

    return {
      agentName: this.agentName,
      currentModel: this.currentModel,
      modelTag: this.getModelTag(),
      totalExecutions: this.executionHistory.length,
      successfulExecutions,
      fallbackExecutions,
      fallbackRate: this.executionHistory.length > 0
        ? (fallbackExecutions / this.executionHistory.length * 100).toFixed(2) + '%'
        : '0%',
      averageDuration: this.executionHistory.length > 0
        ? Math.round(this.executionHistory.reduce((sum, e) => sum + (e.duration || 0), 0) / this.executionHistory.length)
        : 0
    };
  }

  // Get execution history
  getHistory() {
    return this.executionHistory;
  }

  // Clear session and history
  async reset() {
    this.sessionId = null;
    this.executionHistory = [];
    this.fallbackCount = 0;
    console.log(`🔄 [${this.agentName}] Reset complete`);
  }

  // Close and cleanup
  async close() {
    this.sessionId = null;
    console.log(`🔌 [${this.agentName}] Closed`);
  }
}

export default OpenCodeAgent;

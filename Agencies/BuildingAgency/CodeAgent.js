// CodeAgent - Handles coding tasks for BuildingAgency
// Receives prompts from ProjectManager
// Implements code with OpenCode integration and (free)/(paid) model support
// Automatic fallback to free models when paid-provider rate limited

import OpenCodeAgent from '../../lib/OpenCodeAgent.js';

class CodeAgent {
  constructor() {
    this.agent = new OpenCodeAgent('CodeAgent');
    this.currentTask = null;
    this.codeHistory = [];
    this.initialized = false;
  }

  // Initialize with OpenCode
  async initialize() {
    if (this.initialized) return;

    try {
      await this.agent.initialize();
      this.initialized = true;
      console.log(`✅ [CodeAgent] Initialized with model: ${this.agent.currentModel} ${this.agent.getModelTag()}`);
    } catch (error) {
      console.error(`❌ [CodeAgent] Initialization failed:`, error.message);
      throw error;
    }
  }

  // Receive coding task from ProjectManager
  // Accepts options.model to override default model for this specific task
  async receiveTask(prompt, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const modelUsed = options.model || this.agent.currentModel;
    console.log(`📥 [CodeAgent] Received task: ${prompt}`);
    if (options.model) {
      console.log(`🤖 [CodeAgent] Using task-optimized model: ${modelUsed}`);
    }

    this.currentTask = prompt;

    try {
      // Use OpenCode agent to implement the code
      const implementationPrompt = `
${prompt}

Requirements:
1. Write clean, well-documented code
2. Follow best practices and design patterns
3. Include error handling
4. Add helpful comments
5. Make it production-ready

Provide the complete implementation.
      `.trim();

      const code = await this.agent.execute(implementationPrompt, options);

      // Store in history
      const historyEntry = {
        prompt,
        code,
        model: modelUsed,
        modelTag: options.model ? this.agent.getModelTagForModel(modelUsed) : this.agent.getModelTag(),
        timestamp: new Date().toISOString(),
        taskOptimized: !!options.model
      };

      this.codeHistory.push(historyEntry);

      console.log(`✅ [CodeAgent] Implementation complete using ${modelUsed} ${historyEntry.modelTag}`);

      return {
        code,
        model: modelUsed,
        modelTag: historyEntry.modelTag,
        stats: this.agent.getStats()
      };

    } catch (error) {
      console.error(`❌ [CodeAgent] Task failed:`, error.message);
      throw error;
    }
  }

  // Refactor existing code
  async refactorCode(code, requirements) {
    if (!this.initialized) {
      await this.initialize();
    }

    const refactorPrompt = `
Refactor this code according to the requirements:

CURRENT CODE:
${code}

REQUIREMENTS:
${requirements}

Provide the refactored code with explanations of changes.
    `.trim();

    try {
      const refactoredCode = await this.agent.execute(refactorPrompt);

      this.codeHistory.push({
        action: 'refactor',
        originalCode: code,
        refactoredCode,
        requirements,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag(),
        timestamp: new Date().toISOString()
      });

      return {
        code: refactoredCode,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag()
      };

    } catch (error) {
      console.error(`❌ [CodeAgent] Refactoring failed:`, error.message);
      throw error;
    }
  }

  // Debug code
  async debugCode(code, issue) {
    if (!this.initialized) {
      await this.initialize();
    }

    const debugPrompt = `
Debug this code and fix the issue:

CODE:
${code}

ISSUE:
${issue}

Provide:
1. Analysis of the problem
2. Fixed code
3. Explanation of the fix
    `.trim();

    try {
      const debugResult = await this.agent.execute(debugPrompt);

      this.codeHistory.push({
        action: 'debug',
        originalCode: code,
        issue,
        debugResult,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag(),
        timestamp: new Date().toISOString()
      });

      return {
        result: debugResult,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag()
      };

    } catch (error) {
      console.error(`❌ [CodeAgent] Debugging failed:`, error.message);
      throw error;
    }
  }

  // Add feature to existing code
  async addFeature(existingCode, featureDescription) {
    if (!this.initialized) {
      await this.initialize();
    }

    const featurePrompt = `
Add this feature to the existing code:

EXISTING CODE:
${existingCode}

NEW FEATURE:
${featureDescription}

Provide the updated code with the new feature integrated.
    `.trim();

    try {
      const updatedCode = await this.agent.execute(featurePrompt);

      this.codeHistory.push({
        action: 'add-feature',
        existingCode,
        feature: featureDescription,
        updatedCode,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag(),
        timestamp: new Date().toISOString()
      });

      return {
        code: updatedCode,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag()
      };

    } catch (error) {
      console.error(`❌ [CodeAgent] Feature addition failed:`, error.message);
      throw error;
    }
  }

  // Optimize code
  async optimizeCode(code, criteria) {
    if (!this.initialized) {
      await this.initialize();
    }

    const optimizePrompt = `
Optimize this code for: ${criteria}

CODE:
${code}

Provide optimized code with explanation of improvements.
    `.trim();

    try {
      const optimizedCode = await this.agent.execute(optimizePrompt);

      this.codeHistory.push({
        action: 'optimize',
        originalCode: code,
        criteria,
        optimizedCode,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag(),
        timestamp: new Date().toISOString()
      });

      return {
        code: optimizedCode,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag()
      };

    } catch (error) {
      console.error(`❌ [CodeAgent] Optimization failed:`, error.message);
      throw error;
    }
  }

  // Get code history
  getHistory() {
    return this.codeHistory;
  }

  // Get statistics
  getStats() {
    return this.agent.getStats();
  }

  // Clear history
  clearHistory() {
    this.codeHistory = [];
  }

  // Switch model
  async switchModel(modelName) {
    await this.agent.switchModel(modelName);
    console.log(`🔄 [CodeAgent] Switched to ${modelName} ${this.agent.getModelTag()}`);
  }

  // Reset agent
  async reset() {
    await this.agent.reset();
    this.currentTask = null;
    this.codeHistory = [];
  }

  // Close and cleanup
  async close() {
    await this.agent.close();
  }
}

export default CodeAgent;

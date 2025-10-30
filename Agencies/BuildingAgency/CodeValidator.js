// CodeValidator - Validates and tests code for BuildingAgency
// Ensures code does the initiated job correctly
// Works with CodeAgent with OpenCode integration and (free)/(paid) models
// Automatic fallback to free models when paid-provider rate limited

import OpenCodeAgent from '../../lib/OpenCodeAgent.js';

class CodeValidator {
  constructor() {
    this.agent = new OpenCodeAgent('CodeValidator');
    this.validationHistory = [];
    this.testResults = [];
    this.initialized = false;
  }

  // Initialize with OpenCode
  async initialize() {
    if (this.initialized) return;

    try {
      await this.agent.initialize();
      this.initialized = true;
      console.log(`✅ [CodeValidator] Initialized with model: ${this.agent.currentModel} ${this.agent.getModelTag()}`);
    } catch (error) {
      console.error(`❌ [CodeValidator] Initialization failed:`, error.message);
      throw error;
    }
  }

  // Receive validation task from ProjectManager
  // Accepts options.model to override default model for this specific task
  async validateTask(task, code = null, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const modelUsed = options.model || this.agent.currentModel;
    console.log(`📥 [CodeValidator] Validating task: ${task}`);
    if (options.model) {
      console.log(`🤖 [CodeValidator] Using task-optimized model: ${modelUsed}`);
    }

    const validation = {
      task,
      code,
      timestamp: new Date().toISOString(),
      tests: [],
      passed: false,
      needsAdjustment: false,
      feedback: [],
      model: modelUsed,
      modelTag: options.model ? this.agent.getModelTagForModel(modelUsed) : this.agent.getModelTag(),
      taskOptimized: !!options.model
    };

    try {
      // Use OpenCode agent to perform comprehensive validation
      const validationPrompt = `
Validate this code implementation thoroughly:

TASK: ${task}

CODE:
${code || 'No code provided'}

Perform these validation checks:
1. Task Alignment - Does the code address the requirements?
2. Syntax Check - Is the code syntactically correct?
3. Logic Check - Is the implementation logic sound?
4. Error Handling - Does it handle errors properly?
5. Best Practices - Does it follow coding best practices?
6. Performance - Is it reasonably efficient?
7. Security - Are there any security concerns?
8. Maintainability - Is it clean and maintainable?

For each check, respond with:
- Name of check
- PASS or FAIL
- Brief explanation

Then provide an overall summary and specific feedback for improvements.

Format your response clearly with each check on a new line.
      `.trim();

      const validationResponse = await this.agent.execute(validationPrompt, options);

      // Parse validation response
      const tests = this.parseValidationResponse(validationResponse);
      validation.tests = tests;

      // Determine if validation passed
      validation.passed = this.checkPassing(tests);
      validation.needsAdjustment = !validation.passed;

      // Generate feedback if needed
      if (validation.needsAdjustment) {
        validation.feedback = this.generateFeedback(tests, validationResponse);
      }

      // Store validation history
      this.validationHistory.push(validation);

      console.log(`${validation.passed ? '✅' : '⚠️ '} [CodeValidator] Result: ${validation.passed ? 'PASSED' : 'NEEDS ADJUSTMENT'} using ${this.agent.currentModel} ${this.agent.getModelTag()}`);

      return validation;

    } catch (error) {
      validation.error = error.message;
      validation.needsAdjustment = true;
      validation.feedback = [`Validation failed: ${error.message}`];

      console.error(`❌ [CodeValidator] Validation failed:`, error.message);

      return validation;
    }
  }

  // Parse validation response into structured tests
  parseValidationResponse(response) {
    const tests = [];
    const lines = response.split('\n');

    const checkNames = [
      'Task Alignment',
      'Syntax Check',
      'Logic Check',
      'Error Handling',
      'Best Practices',
      'Performance',
      'Security',
      'Maintainability'
    ];

    for (const checkName of checkNames) {
      // Look for this check in the response
      const checkLine = lines.find(line =>
        line.toLowerCase().includes(checkName.toLowerCase())
      );

      if (checkLine) {
        const passed = checkLine.toLowerCase().includes('pass') &&
                      !checkLine.toLowerCase().includes('fail');

        tests.push({
          name: checkName,
          passed,
          description: checkLine.trim()
        });
      } else {
        // Default to pending if not found
        tests.push({
          name: checkName,
          passed: false,
          description: 'Check not completed'
        });
      }
    }

    return tests;
  }

  // Quick validation with basic checks
  async quickValidate(code) {
    if (!this.initialized) {
      await this.initialize();
    }

    const quickPrompt = `
Quickly validate this code for major issues:

CODE:
${code}

Check for:
1. Syntax errors
2. Obvious logic bugs
3. Missing error handling

Respond with:
- PASS or FAIL
- List of issues (if any)
    `.trim();

    try {
      const response = await this.agent.execute(quickPrompt);

      return {
        passed: response.toLowerCase().includes('pass') &&
                !response.toLowerCase().includes('fail'),
        feedback: response,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag()
      };

    } catch (error) {
      return {
        passed: false,
        feedback: `Quick validation failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // Security audit
  async securityAudit(code) {
    if (!this.initialized) {
      await this.initialize();
    }

    const securityPrompt = `
Perform a security audit on this code:

CODE:
${code}

Check for:
1. Injection vulnerabilities (SQL, XSS, etc.)
2. Authentication/authorization issues
3. Data exposure risks
4. Insecure dependencies
5. Cryptographic weaknesses
6. Input validation

Provide:
- List of security issues found
- Severity (HIGH/MEDIUM/LOW)
- Recommendations for fixes
    `.trim();

    try {
      const audit = await this.agent.execute(securityPrompt);

      this.validationHistory.push({
        type: 'security-audit',
        code,
        audit,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag(),
        timestamp: new Date().toISOString()
      });

      return {
        audit,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag()
      };

    } catch (error) {
      console.error(`❌ [CodeValidator] Security audit failed:`, error.message);
      throw error;
    }
  }

  // Performance analysis
  async analyzePerformance(code) {
    if (!this.initialized) {
      await this.initialize();
    }

    const performancePrompt = `
Analyze the performance of this code:

CODE:
${code}

Evaluate:
1. Time complexity
2. Space complexity
3. Potential bottlenecks
4. Optimization opportunities
5. Scalability concerns

Provide specific recommendations.
    `.trim();

    try {
      const analysis = await this.agent.execute(performancePrompt);

      this.validationHistory.push({
        type: 'performance-analysis',
        code,
        analysis,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag(),
        timestamp: new Date().toISOString()
      });

      return {
        analysis,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag()
      };

    } catch (error) {
      console.error(`❌ [CodeValidator] Performance analysis failed:`, error.message);
      throw error;
    }
  }

  // Check if overall validation passed
  checkPassing(testResults) {
    if (!testResults || testResults.length === 0) return false;

    // Require at least 75% of tests to pass
    const passCount = testResults.filter(test => test.passed).length;
    const passRate = passCount / testResults.length;

    return passRate >= 0.75;
  }

  // Generate feedback for failed tests
  generateFeedback(testResults, fullResponse) {
    const feedback = [];

    // Add feedback for failed tests
    const failedTests = testResults.filter(test => !test.passed);

    for (const test of failedTests) {
      feedback.push(`${test.name}: ${test.description}`);
    }

    // Try to extract additional feedback from full response
    const lines = fullResponse.split('\n');
    const feedbackSection = lines.find(line =>
      line.toLowerCase().includes('feedback') ||
      line.toLowerCase().includes('improvement')
    );

    if (feedbackSection) {
      feedback.push(feedbackSection.trim());
    }

    return feedback;
  }

  // Get validation history
  getHistory() {
    return this.validationHistory;
  }

  // Get statistics
  getStats() {
    const stats = this.agent.getStats();

    const totalValidations = this.validationHistory.filter(v => v.tests).length;
    const passedValidations = this.validationHistory.filter(v => v.passed).length;

    return {
      ...stats,
      totalValidations,
      passedValidations,
      failRate: totalValidations > 0
        ? (((totalValidations - passedValidations) / totalValidations) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  // Clear history
  clearHistory() {
    this.validationHistory = [];
    this.testResults = [];
  }

  // Switch model
  async switchModel(modelName) {
    await this.agent.switchModel(modelName);
    console.log(`🔄 [CodeValidator] Switched to ${modelName} ${this.agent.getModelTag()}`);
  }

  // Reset agent
  async reset() {
    await this.agent.reset();
    this.validationHistory = [];
    this.testResults = [];
  }

  // Close and cleanup
  async close() {
    await this.agent.close();
  }
}

export default CodeValidator;

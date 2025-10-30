// Project Manager - Creates prompts and delegates to agents
// Manages BuildingAgency operations with OpenCode integration
// Creates prompts for its own agency, knowing their capabilities
// Uses OpenCode with (free) and (paid) model tagging and automatic fallback

import OpenCodeAgent from '../../lib/OpenCodeAgent.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectManager {
  constructor() {
    this.agent = new OpenCodeAgent('ProjectManager');
    this.agents = {
      CodeAgent: null,
      CodeValidator: null,
      executionEnvironment: null
    };
    this.currentTask = null;
    this.taskQueue = [];
    this.initialized = false;
  }

  // Initialize with OpenCode
  async initialize() {
    if (this.initialized) return;

    try {
      await this.agent.initialize();

      // Initialize sub-agents
      const { default: CodeAgent } = await import('./CodeAgent.js');
      const { default: CodeValidator } = await import('./CodeValidator.js');

      this.agents.CodeAgent = new CodeAgent();
      await this.agents.CodeAgent.initialize();

      this.agents.CodeValidator = new CodeValidator();
      await this.agents.CodeValidator.initialize();

      this.initialized = true;
      console.log(`✅ [ProjectManager] Initialized with model: ${this.agent.currentModel} ${this.agent.getModelTag()}`);
    } catch (error) {
      console.error(`❌ [ProjectManager] Initialization failed:`, error.message);
      throw error;
    }
  }

  // Receive prompt from apex-orchestrator
  async receivePrompt(prompt) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`📥 [ProjectManager] Received prompt: ${prompt}`);

    // Use OpenCode agent to analyze and plan the task
    const planningPrompt = `
Analyze this development task and create a detailed execution plan:

TASK: ${prompt}

Provide a structured plan including:
1. Task breakdown
2. Which agents to involve (CodeAgent, CodeValidator)
3. Execution order
4. Success criteria
5. Potential challenges

Be specific and actionable.
    `.trim();

    try {
      const plan = await this.agent.execute(planningPrompt);
      console.log(`📋 [ProjectManager] Created plan:\n${plan}`);

      // Create specific prompts for agents based on plan
      const agentPrompts = await this.createAgentPrompts(prompt, plan);

      // Route tasks to agents in logical order
      const result = await this.routeTasks(agentPrompts);

      return {
        originalPrompt: prompt,
        plan,
        result,
        stats: this.agent.getStats()
      };

    } catch (error) {
      console.error(`❌ [ProjectManager] Failed to process prompt:`, error.message);
      throw error;
    }
  }

  // Create prompts for agents knowing their capabilities
  async createAgentPrompts(originalPrompt, plan) {
    const prompts = {};

    // Use AI to create agent-specific prompts
    const promptCreationTask = `
Based on this plan:
${plan}

Original task: ${originalPrompt}

Create specific, detailed prompts for:
1. CodeAgent - What code to implement
2. CodeValidator - What to validate and test

Format as JSON:
{
  "CodeAgent": "...",
  "CodeValidator": "..."
}
    `.trim();

    try {
      const response = await this.agent.execute(promptCreationTask);

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        prompts.CodeAgent = parsed.CodeAgent;
        prompts.CodeValidator = parsed.CodeValidator;
      } else {
        // Fallback to simple prompts
        prompts.CodeAgent = `Implement: ${originalPrompt}`;
        prompts.CodeValidator = `Validate this implementation: ${originalPrompt}`;
      }

    } catch (error) {
      console.warn(`⚠️  [ProjectManager] Failed to create structured prompts, using fallback`);
      prompts.CodeAgent = `Implement: ${originalPrompt}`;
      prompts.CodeValidator = `Validate this implementation: ${originalPrompt}`;
    }

    // If prompt includes code, also prepare for execution environment
    if (this.includesCode(originalPrompt)) {
      prompts.executionEnvironment = originalPrompt;
    }

    return prompts;
  }

  // Route tasks to agents in logical order with optimal model selection
  async routeTasks(prompts) {
    const results = {
      steps: [],
      finalStatus: 'pending',
      modelSelections: []
    };

    try {
      // Step 1: Send to CodeAgent if needed
      if (prompts.CodeAgent) {
        console.log(`📤 [ProjectManager] Delegating to CodeAgent...`);

        // Recommend optimal model for this specific task
        const modelRec = this.agents.CodeAgent.agent.recommendModelForTask(
          prompts.CodeAgent,
          { preferFree: process.env.PREFER_FREE_MODELS === 'true' }
        );

        console.log(`🤖 [ProjectManager] Selected ${modelRec.recommendedModel} ${modelRec.modelInfo.tier === 'free' ? '(free)' : '(paid)'} for CodeAgent task`);

        results.modelSelections.push({
          agent: 'CodeAgent',
          model: modelRec.recommendedModel,
          tier: modelRec.modelInfo.tier,
          reason: 'Task-optimized selection',
          score: modelRec.score
        });

        const codeResult = await this.agents.CodeAgent.receiveTask(prompts.CodeAgent, {
          model: modelRec.recommendedModel
        });

        results.steps.push({
          agent: 'CodeAgent',
          prompt: prompts.CodeAgent,
          result: codeResult,
          status: 'completed',
          modelUsed: modelRec.recommendedModel
        });
        results.code = codeResult.code;
      }

      // Step 2: Send to execution environment if code included
      if (prompts.executionEnvironment && results.code) {
        console.log(`🔧 [ProjectManager] Sending to execution environment...`);
        // Would integrate with actual execution environment
        results.steps.push({
          agent: 'executionEnvironment',
          prompt: prompts.executionEnvironment,
          result: { executed: true, code: results.code },
          status: 'completed'
        });
      }

      // Step 3: Validate the work
      if (prompts.CodeValidator && results.code) {
        console.log(`✅ [ProjectManager] Delegating to CodeValidator...`);

        // Recommend optimal model for validation
        const validatorModelRec = this.agents.CodeValidator.agent.recommendModelForTask(
          prompts.CodeValidator,
          { preferFree: process.env.PREFER_FREE_MODELS === 'true' }
        );

        console.log(`🤖 [ProjectManager] Selected ${validatorModelRec.recommendedModel} ${validatorModelRec.modelInfo.tier === 'free' ? '(free)' : '(paid)'} for CodeValidator task`);

        results.modelSelections.push({
          agent: 'CodeValidator',
          model: validatorModelRec.recommendedModel,
          tier: validatorModelRec.modelInfo.tier,
          reason: 'Task-optimized selection',
          score: validatorModelRec.score
        });

        const validationResult = await this.agents.CodeValidator.validateTask(
          prompts.CodeValidator,
          results.code,
          { model: validatorModelRec.recommendedModel }
        );

        results.steps.push({
          agent: 'CodeValidator',
          prompt: prompts.CodeValidator,
          result: validationResult,
          status: 'completed',
          modelUsed: validatorModelRec.recommendedModel
        });
        results.validation = validationResult;

        // Step 4: Iterate if adjustment needed
        if (validationResult.needsAdjustment) {
          console.log(`🔄 [ProjectManager] Validation failed, iterating...`);
          const adjustedResult = await this.iterateAdjustment(results, validationResult);
          results.steps.push({
            agent: 'ProjectManager',
            action: 'iteration',
            result: adjustedResult,
            status: 'completed'
          });
        }
      }

      // Step 5: Submit for approval
      results.finalStatus = 'awaiting_approval';
      const approval = await this.submitForApproval(results);
      results.approval = approval;

      return results;

    } catch (error) {
      results.finalStatus = 'error';
      results.error = error.message;
      console.error(`❌ [ProjectManager] Task routing failed:`, error.message);
      throw error;
    }
  }

  // Check if prompt includes code
  includesCode(prompt) {
    const codeIndicators = [
      'function', 'class', 'const', 'let', 'var', 'def', 'import', 'export',
      'async', 'await', 'return', '=>', 'interface', 'type'
    ];
    return codeIndicators.some(indicator => prompt.includes(indicator));
  }

  // Iterate upon adjustment
  async iterateAdjustment(results, validationResult) {
    console.log(`🔄 [ProjectManager] Iterating based on feedback...`);

    const iterationPrompt = `
The code validation failed. Here's the feedback:

FEEDBACK:
${validationResult.feedback.join('\n')}

FAILED TESTS:
${validationResult.tests.filter(t => !t.passed).map(t => `- ${t.name}: ${t.description}`).join('\n')}

ORIGINAL CODE:
${results.code}

Provide specific suggestions for fixing these issues.
    `.trim();

    try {
      const suggestions = await this.agent.execute(iterationPrompt);
      return {
        suggestions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ [ProjectManager] Iteration failed:`, error.message);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Submit for initiated approval and additional directives
  async submitForApproval(results) {
    console.log(`📋 [ProjectManager] Preparing approval submission...`);

    const approvalPrompt = `
Summarize this development task for approval:

TASK COMPLETED:
${JSON.stringify(results.steps.map(s => ({
      agent: s.agent,
      status: s.status
    })), null, 2)}

VALIDATION STATUS:
${results.validation ? (results.validation.passed ? 'PASSED ✅' : 'NEEDS WORK ⚠️') : 'Not validated'}

Provide a brief summary for user approval.
    `.trim();

    try {
      const summary = await this.agent.execute(approvalPrompt);
      return {
        summary,
        status: 'awaiting_approval',
        submitted: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ [ProjectManager] Approval preparation failed:`, error.message);
      return {
        error: error.message,
        status: 'error',
        submitted: new Date().toISOString()
      };
    }
  }

  // Get statistics
  getStats() {
    const stats = {
      projectManager: this.agent.getStats()
    };

    if (this.agents.CodeAgent) {
      stats.codeAgent = this.agents.CodeAgent.getStats();
    }

    if (this.agents.CodeValidator) {
      stats.codeValidator = this.agents.CodeValidator.getStats();
    }

    return stats;
  }

  // Reset all agents
  async reset() {
    await this.agent.reset();
    if (this.agents.CodeAgent) await this.agents.CodeAgent.reset();
    if (this.agents.CodeValidator) await this.agents.CodeValidator.reset();
    this.currentTask = null;
    this.taskQueue = [];
  }

  // Close and cleanup
  async close() {
    await this.agent.close();
    if (this.agents.CodeAgent) await this.agents.CodeAgent.close();
    if (this.agents.CodeValidator) await this.agents.CodeValidator.close();
  }
}

export default ProjectManager;

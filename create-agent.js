#!/usr/bin/env node

// Create Agent - Interactive CLI for creating new agents
// Shows available models with (free) or (paid) labels
// Allows selecting free models as alternatives to Claude

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AgentCreator {
  constructor() {
    this.config = null;
    this.rl = null;
  }

  async initialize() {
    // Load model config
    const configPath = path.join(__dirname, 'config', 'agent-config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    this.config = JSON.parse(configData);

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async createAgent() {
    console.log('\n' + '╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(25) + 'CREATE NEW AGENT' + ' '.repeat(37) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');

    // Select agency
    const agencies = await this.listAgencies();
    console.log('\n📁 Available Agencies:');
    agencies.forEach((agency, i) => {
      console.log(`   ${i + 1}. ${agency}`);
    });

    const agencyIndex = await this.prompt('\nSelect agency (number): ');
    const agencyName = agencies[parseInt(agencyIndex) - 1];

    if (!agencyName) {
      console.log('❌ Invalid agency selection');
      process.exit(1);
    }

    console.log(`\n✅ Selected: ${agencyName}`);

    // Agent details
    const agentName = await this.prompt('\nAgent name (e.g., FrontendAgent): ');
    const agentDescription = await this.prompt('Agent description: ');
    const agentType = await this.prompt('Agent type (default: same as name): ') || agentName;

    // Select primary model
    console.log('\n\n🤖 SELECT PRIMARY MODEL:\n');
    console.log('Available models:\n');

    const models = Object.entries(this.config.models);
    models.forEach(([name, info], i) => {
      const tag = info.tier === 'free' ? '(free)' : '(paid)';
      const capabilities = info.capabilities.join(', ');
      console.log(`   ${i + 1}. ${name} ${tag}`);
      console.log(`      Provider: ${info.provider}`);
      console.log(`      Capabilities: ${capabilities}`);
      console.log(`      Cost: ${info.tier === 'free' ? 'FREE' : `$${info.costPer1kTokens}/1k tokens`}`);
      console.log('');
    });

    const primaryIndex = await this.prompt('Select primary model (number): ');
    const primaryModel = models[parseInt(primaryIndex) - 1][0];

    console.log(`\n✅ Primary model: ${primaryModel} ${this.getModelTag(primaryModel)}`);

    // Select fallback models
    console.log('\n\n🔄 SELECT FALLBACK MODELS (optional):\n');
    console.log('Fallback models are used when primary model is rate-limited.');
    console.log('💡 TIP: Select free models as fallbacks to avoid rate limits!\n');

    const wantFallback = await this.prompt('Add fallback models? (y/n): ');
    const fallbackModels = [];

    if (wantFallback.toLowerCase() === 'y') {
      let addingFallbacks = true;

      while (addingFallbacks) {
        console.log('\nAvailable fallback models:\n');

        // Show models except already selected ones
        const available = models.filter(([name]) =>
          name !== primaryModel && !fallbackModels.includes(name)
        );

        available.forEach(([name, info], i) => {
          const tag = info.tier === 'free' ? '(free) ⭐' : '(paid)';
          console.log(`   ${i + 1}. ${name} ${tag}`);
        });

        const fallbackIndex = await this.prompt('\nSelect fallback model (number, or 0 to finish): ');

        if (fallbackIndex === '0') {
          addingFallbacks = false;
        } else {
          const fallback = available[parseInt(fallbackIndex) - 1][0];
          if (fallback) {
            fallbackModels.push(fallback);
            console.log(`✅ Added fallback: ${fallback} ${this.getModelTag(fallback)}`);
          }
        }
      }
    }

    // System prompt
    console.log('\n\n📝 AGENT SYSTEM PROMPT:\n');
    const systemPrompt = await this.prompt('System prompt for agent: ');

    // Summary
    console.log('\n\n' + '═'.repeat(80));
    console.log('📋 AGENT CONFIGURATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`\nAgency: ${agencyName}`);
    console.log(`Agent Name: ${agentName}`);
    console.log(`Description: ${agentDescription}`);
    console.log(`Type: ${agentType}`);
    console.log(`\nPrimary Model: ${primaryModel} ${this.getModelTag(primaryModel)}`);

    if (fallbackModels.length > 0) {
      console.log(`Fallback Models:`);
      fallbackModels.forEach(m => {
        console.log(`  - ${m} ${this.getModelTag(m)}`);
      });
    }

    console.log(`\nSystem Prompt: ${systemPrompt}`);
    console.log('\n' + '═'.repeat(80));

    const confirm = await this.prompt('\nCreate this agent? (y/n): ');

    if (confirm.toLowerCase() !== 'y') {
      console.log('\n❌ Agent creation cancelled');
      process.exit(0);
    }

    // Create agent
    await this.writeAgentFiles(agencyName, {
      name: agentName,
      description: agentDescription,
      type: agentType,
      primaryModel,
      fallbackModels,
      systemPrompt
    });

    console.log('\n✅ Agent created successfully!');
    console.log(`\n📁 Files created:`);
    console.log(`   - Agencies/${agencyName}/${agentName}.js`);
    console.log(`   - Agencies/${agencyName}/agency.json (updated)`);

    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review generated files`);
    console.log(`   2. Update ProjectManager.js to use new agent`);
    console.log(`   3. Deploy agency: ./deploy-agency.sh ${agencyName}`);

    this.rl.close();
  }

  getModelTag(modelName) {
    const model = this.config.models[modelName];
    return model ? `(${model.tier})` : '';
  }

  async listAgencies() {
    const agenciesDir = path.join(__dirname, 'Agencies');
    const entries = await fs.readdir(agenciesDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  }

  async writeAgentFiles(agencyName, agentConfig) {
    const agencyPath = path.join(__dirname, 'Agencies', agencyName);

    // Generate agent file
    const agentCode = this.generateAgentCode(agentConfig);
    const agentFilePath = path.join(agencyPath, `${agentConfig.name}.js`);
    await fs.writeFile(agentFilePath, agentCode);

    // Update agency.json
    const configPath = path.join(agencyPath, 'agency.json');
    const agencyData = await fs.readFile(configPath, 'utf-8');
    const agencyJson = JSON.parse(agencyData);

    // Add agent to config
    agencyJson.agents.push({
      name: agentConfig.name,
      type: agentConfig.type,
      description: agentConfig.description,
      file: `${agentConfig.name}.js`,
      model: agentConfig.primaryModel,
      fallbackModels: agentConfig.fallbackModels
    });

    await fs.writeFile(configPath, JSON.stringify(agencyJson, null, 2));
  }

  generateAgentCode(agentConfig) {
    const fallbackModelsStr = JSON.stringify(agentConfig.fallbackModels);

    return `// ${agentConfig.name} - ${agentConfig.description}
// Part of agency
// Uses OpenCode with (free)/(paid) models and automatic fallback

import OpenCodeAgent from '../../lib/OpenCodeAgent.js';

class ${agentConfig.name} {
  constructor() {
    this.agent = new OpenCodeAgent('${agentConfig.type}');
    this.history = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.agent.initialize();
      this.initialized = true;
      console.log(\`✅ [${agentConfig.name}] Initialized with model: \${this.agent.currentModel} \${this.agent.getModelTag()}\`);
    } catch (error) {
      console.error(\`❌ [${agentConfig.name}] Initialization failed:\`, error.message);
      throw error;
    }
  }

  async receiveTask(prompt, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const modelUsed = options.model || this.agent.currentModel;
    console.log(\`📥 [${agentConfig.name}] Received task: \${prompt}\`);
    if (options.model) {
      console.log(\`🤖 [${agentConfig.name}] Using task-optimized model: \${modelUsed}\`);
    }

    try {
      const taskPrompt = \`
${agentConfig.systemPrompt}

\${prompt}

Execute this task with high quality.
      \`.trim();

      const result = await this.agent.execute(taskPrompt, options);

      this.history.push({
        prompt,
        result,
        model: modelUsed,
        modelTag: options.model ? this.agent.getModelTagForModel(modelUsed) : this.agent.getModelTag(),
        timestamp: new Date().toISOString(),
        taskOptimized: !!options.model
      });

      console.log(\`✅ [${agentConfig.name}] Task complete using \${modelUsed} \${this.history[this.history.length - 1].modelTag}\`);

      return {
        result,
        model: modelUsed,
        modelTag: this.history[this.history.length - 1].modelTag,
        stats: this.agent.getStats()
      };
    } catch (error) {
      console.error(\`❌ [${agentConfig.name}] Task failed:\`, error.message);
      throw error;
    }
  }

  getHistory() {
    return this.history;
  }

  getStats() {
    return this.agent.getStats();
  }

  async switchModel(modelName) {
    await this.agent.switchModel(modelName);
    console.log(\`🔄 [${agentConfig.name}] Switched to \${modelName} \${this.agent.getModelTag()}\`);
  }

  async reset() {
    await this.agent.reset();
    this.history = [];
  }

  async close() {
    await this.agent.close();
  }
}

export default ${agentConfig.name};
`;
  }
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  const creator = new AgentCreator();

  creator.initialize()
    .then(() => creator.createAgent())
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

export default AgentCreator;

#!/usr/bin/env node

// Agency Template Generator
// Creates new agencies with Project Manager, Validator, and custom agents
// Uses OpenCode integration with (free)/(paid) model support

const fs = require('fs').promises;
const path = require('path');

const TEMPLATES = {
  projectManager: `// Project Manager - Creates prompts and delegates to agents
// Manages {{AGENCY_NAME}} operations with OpenCode integration
// Creates prompts for its own agency, knowing their capabilities
// Uses OpenCode with (free) and (paid) model tagging and automatic fallback

const OpenCodeAgent = require('../../lib/OpenCodeAgent');

class ProjectManager {
  constructor() {
    this.agent = new OpenCodeAgent('ProjectManager');
    this.agents = {
{{AGENT_REFS}}
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
{{AGENT_INIT}}

      this.initialized = true;
      console.log(\`✅ [ProjectManager] Initialized with model: \${this.agent.currentModel} \${this.agent.getModelTag()}\`);
    } catch (error) {
      console.error(\`❌ [ProjectManager] Initialization failed:\`, error.message);
      throw error;
    }
  }

  // Receive prompt from apex-orchestrator
  async receivePrompt(prompt) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(\`📥 [ProjectManager] Received prompt: \${prompt}\`);

    const planningPrompt = \`
Analyze this {{AGENCY_PURPOSE}} task and create a detailed execution plan:

TASK: \${prompt}

Provide a structured plan including:
1. Task breakdown
2. Which agents to involve ({{AGENT_LIST}})
3. Execution order
4. Success criteria
5. Potential challenges

Be specific and actionable.
    \`.trim();

    try {
      const plan = await this.agent.execute(planningPrompt);
      console.log(\`📋 [ProjectManager] Created plan:\\n\${plan}\`);

      const agentPrompts = await this.createAgentPrompts(prompt, plan);
      const result = await this.routeTasks(agentPrompts);

      return {
        originalPrompt: prompt,
        plan,
        result,
        stats: this.agent.getStats()
      };
    } catch (error) {
      console.error(\`❌ [ProjectManager] Failed to process prompt:\`, error.message);
      throw error;
    }
  }

  // Create prompts for agents
  async createAgentPrompts(originalPrompt, plan) {
    // Custom prompt creation logic for {{AGENCY_NAME}}
    const prompts = {};

    // Delegate to appropriate agents based on task
{{PROMPT_CREATION_LOGIC}}

    return prompts;
  }

  // Route tasks to agents
  async routeTasks(prompts) {
    const results = {
      steps: [],
      finalStatus: 'pending'
    };

    try {
{{ROUTING_LOGIC}}

      results.finalStatus = 'completed';
      return results;
    } catch (error) {
      results.finalStatus = 'error';
      results.error = error.message;
      throw error;
    }
  }

  // Get statistics
  getStats() {
    const stats = {
      projectManager: this.agent.getStats()
    };

{{STATS_COLLECTION}}

    return stats;
  }

  async reset() {
    await this.agent.reset();
{{AGENT_RESET}}
    this.currentTask = null;
    this.taskQueue = [];
  }

  async close() {
    await this.agent.close();
{{AGENT_CLOSE}}
  }
}

module.exports = ProjectManager;
`,

  genericAgent: `// {{AGENT_NAME}} - {{AGENT_DESCRIPTION}}
// Part of {{AGENCY_NAME}}
// Uses OpenCode with (free)/(paid) models and automatic fallback

const OpenCodeAgent = require('../../lib/OpenCodeAgent');

class {{AGENT_CLASS}} {
  constructor() {
    this.agent = new OpenCodeAgent('{{AGENT_TYPE}}');
    this.history = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.agent.initialize();
      this.initialized = true;
      console.log(\`✅ [{{AGENT_NAME}}] Initialized with model: \${this.agent.currentModel} \${this.agent.getModelTag()}\`);
    } catch (error) {
      console.error(\`❌ [{{AGENT_NAME}}] Initialization failed:\`, error.message);
      throw error;
    }
  }

  async receiveTask(prompt) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(\`📥 [{{AGENT_NAME}}] Received task: \${prompt}\`);

    try {
      const taskPrompt = \`
\${prompt}

{{AGENT_SPECIFIC_INSTRUCTIONS}}
      \`.trim();

      const result = await this.agent.execute(taskPrompt);

      this.history.push({
        prompt,
        result,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag(),
        timestamp: new Date().toISOString()
      });

      console.log(\`✅ [{{AGENT_NAME}}] Task complete using \${this.agent.currentModel} \${this.agent.getModelTag()}\`);

      return {
        result,
        model: this.agent.currentModel,
        modelTag: this.agent.getModelTag(),
        stats: this.agent.getStats()
      };
    } catch (error) {
      console.error(\`❌ [{{AGENT_NAME}}] Task failed:\`, error.message);
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
    console.log(\`🔄 [{{AGENT_NAME}}] Switched to \${modelName} \${this.agent.getModelTag()}\`);
  }

  async reset() {
    await this.agent.reset();
    this.history = [];
  }

  async close() {
    await this.agent.close();
  }
}

module.exports = {{AGENT_CLASS}};
`,

  agencyConfig: `{
  "name": "{{AGENCY_NAME}}",
  "description": "{{AGENCY_DESCRIPTION}}",
  "purpose": "{{AGENCY_PURPOSE}}",
  "created": "{{TIMESTAMP}}",
  "projectManager": {
    "file": "ProjectManager.js",
    "model": "claude-sonnet"
  },
  "agents": [
{{AGENT_CONFIGS}}
  ],
  "capabilities": {{CAPABILITIES}},
  "keywords": {{KEYWORDS}}
}
`
};

class AgencyGenerator {
  constructor() {
    this.agenciesDir = path.join(__dirname, '../Agencies');
  }

  async createAgency(config) {
    console.log(`\n🏢 Creating agency: ${config.name}`);

    const agencyPath = path.join(this.agenciesDir, config.name);

    // Create agency directory
    try {
      await fs.mkdir(agencyPath, { recursive: true });
      console.log(`✅ Created directory: ${agencyPath}`);
    } catch (error) {
      console.error(`❌ Failed to create directory:`, error.message);
      throw error;
    }

    // Generate Project Manager
    await this.generateProjectManager(agencyPath, config);

    // Generate agents
    for (const agent of config.agents) {
      await this.generateAgent(agencyPath, config.name, agent);
    }

    // Generate agency config file
    await this.generateAgencyConfig(agencyPath, config);

    console.log(`\n✅ Agency "${config.name}" created successfully!`);
    console.log(`📁 Location: ${agencyPath}`);
  }

  async generateProjectManager(agencyPath, config) {
    console.log(`  📝 Generating ProjectManager...`);

    const agentRefs = config.agents
      .map(a => `      ${a.name}: null`)
      .join(',\n');

    const agentInit = config.agents
      .map(a => `      const ${a.name} = require('./${a.name}');
      this.agents.${a.name} = new ${a.name}();
      await this.agents.${a.name}.initialize();`)
      .join('\n\n');

    const agentList = config.agents.map(a => a.name).join(', ');

    const promptCreationLogic = config.agents
      .map(a => `    // Delegate to ${a.name}
    if (this.shouldUse${a.name}(originalPrompt)) {
      prompts.${a.name} = \`Handle this task: \${originalPrompt}\`;
    }`)
      .join('\n\n');

    const routingLogic = config.agents
      .map((a, i) => `      // ${i + 1}. Route to ${a.name}
      if (prompts.${a.name}) {
        console.log(\`📤 [ProjectManager] Delegating to ${a.name}...\`);
        const result = await this.agents.${a.name}.receiveTask(prompts.${a.name});
        results.steps.push({
          agent: '${a.name}',
          prompt: prompts.${a.name},
          result,
          status: 'completed'
        });
      }`)
      .join('\n\n');

    const statsCollection = config.agents
      .map(a => `    if (this.agents.${a.name}) {
      stats.${a.name.toLowerCase()} = this.agents.${a.name}.getStats();
    }`)
      .join('\n\n');

    const agentReset = config.agents
      .map(a => `    if (this.agents.${a.name}) await this.agents.${a.name}.reset();`)
      .join('\n');

    const agentClose = config.agents
      .map(a => `    if (this.agents.${a.name}) await this.agents.${a.name}.close();`)
      .join('\n');

    const pmContent = TEMPLATES.projectManager
      .replace(/{{AGENCY_NAME}}/g, config.name)
      .replace(/{{AGENCY_PURPOSE}}/g, config.purpose)
      .replace(/{{AGENT_REFS}}/g, agentRefs)
      .replace(/{{AGENT_INIT}}/g, agentInit)
      .replace(/{{AGENT_LIST}}/g, agentList)
      .replace(/{{PROMPT_CREATION_LOGIC}}/g, promptCreationLogic)
      .replace(/{{ROUTING_LOGIC}}/g, routingLogic)
      .replace(/{{STATS_COLLECTION}}/g, statsCollection)
      .replace(/{{AGENT_RESET}}/g, agentReset)
      .replace(/{{AGENT_CLOSE}}/g, agentClose);

    const pmPath = path.join(agencyPath, 'ProjectManager.js');
    await fs.writeFile(pmPath, pmContent);
    console.log(`  ✅ Created ProjectManager.js`);
  }

  async generateAgent(agencyPath, agencyName, agentConfig) {
    console.log(`  📝 Generating ${agentConfig.name}...`);

    const agentContent = TEMPLATES.genericAgent
      .replace(/{{AGENT_NAME}}/g, agentConfig.name)
      .replace(/{{AGENT_CLASS}}/g, agentConfig.name)
      .replace(/{{AGENT_DESCRIPTION}}/g, agentConfig.description)
      .replace(/{{AGENT_TYPE}}/g, agentConfig.type || agentConfig.name)
      .replace(/{{AGENCY_NAME}}/g, agencyName)
      .replace(/{{AGENT_SPECIFIC_INSTRUCTIONS}}/g, agentConfig.instructions || 'Complete the task with high quality.');

    const agentPath = path.join(agencyPath, `${agentConfig.name}.js`);
    await fs.writeFile(agentPath, agentContent);
    console.log(`  ✅ Created ${agentConfig.name}.js`);
  }

  async generateAgencyConfig(agencyPath, config) {
    console.log(`  📝 Generating agency.json...`);

    const agentConfigs = config.agents
      .map(a => `    {
      "name": "${a.name}",
      "type": "${a.type || a.name}",
      "description": "${a.description}",
      "file": "${a.name}.js",
      "model": "${a.model || 'claude-sonnet'}"
    }`)
      .join(',\n');

    const configContent = TEMPLATES.agencyConfig
      .replace(/{{AGENCY_NAME}}/g, config.name)
      .replace(/{{AGENCY_DESCRIPTION}}/g, config.description)
      .replace(/{{AGENCY_PURPOSE}}/g, config.purpose)
      .replace(/{{TIMESTAMP}}/g, new Date().toISOString())
      .replace(/{{AGENT_CONFIGS}}/g, agentConfigs)
      .replace(/{{CAPABILITIES}}/g, JSON.stringify(config.capabilities || [], null, 2))
      .replace(/{{KEYWORDS}}/g, JSON.stringify(config.keywords || [], null, 2));

    const configPath = path.join(agencyPath, 'agency.json');
    await fs.writeFile(configPath, configContent);
    console.log(`  ✅ Created agency.json`);
  }

  async listAgencies() {
    try {
      const agencies = await fs.readdir(this.agenciesDir);
      console.log('\n🏢 Existing Agencies:');

      for (const agency of agencies) {
        const configPath = path.join(this.agenciesDir, agency, 'agency.json');
        try {
          const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
          console.log(`\n  ${agency}`);
          console.log(`    Description: ${config.description}`);
          console.log(`    Agents: ${config.agents.map(a => a.name).join(', ')}`);
        } catch (error) {
          console.log(`\n  ${agency} (no config)`);
        }
      }
    } catch (error) {
      console.error('Error listing agencies:', error.message);
    }
  }
}

// CLI interface
if (require.main === module) {
  const generator = new AgencyGenerator();

  const command = process.argv[2];

  if (command === 'list') {
    generator.listAgencies();
  } else if (command === 'create') {
    // Read config from file or stdin
    const configFile = process.argv[3];

    if (!configFile) {
      console.log(`
Usage: node create-agency.js create <config-file>
       node create-agency.js list

Example config file:
{
  "name": "WebDevAgency",
  "description": "Web development agency",
  "purpose": "web development",
  "agents": [
    {
      "name": "FrontendAgent",
      "description": "Frontend development specialist",
      "type": "FrontendAgent"
    },
    {
      "name": "BackendAgent",
      "description": "Backend development specialist",
      "type": "BackendAgent"
    },
    {
      "name": "CodeValidator",
      "description": "Code validation and testing",
      "type": "CodeValidator"
    }
  ],
  "capabilities": ["frontend", "backend", "fullstack", "web"],
  "keywords": ["web", "frontend", "backend", "api", "ui", "ux"]
}
      `);
      process.exit(1);
    }

    fs.readFile(configFile, 'utf-8')
      .then(data => JSON.parse(data))
      .then(config => generator.createAgency(config))
      .catch(error => {
        console.error('Error creating agency:', error.message);
        process.exit(1);
      });
  } else {
    console.log(`
Agency Generator - Create new agencies with OpenCode integration

Commands:
  create <config-file>  Create a new agency from config file
  list                  List all existing agencies

Examples:
  node create-agency.js create webdev-agency.json
  node create-agency.js list
    `);
  }
}

module.exports = AgencyGenerator;

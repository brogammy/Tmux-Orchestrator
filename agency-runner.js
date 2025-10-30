#!/usr/bin/env node

// Agency Runner - Runs inside agency container
// Starts Project Manager and agents
// Each agent runs as a separate process (not tmux panels in container)

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENCY_NAME = process.env.AGENCY_NAME || 'BuildingAgency';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║              AGENCY CONTAINER STARTING                         ║
║              ${AGENCY_NAME.padEnd(50)}║
╚════════════════════════════════════════════════════════════════╝
`);

class AgencyRunner {
  constructor(agencyName) {
    this.agencyName = agencyName;
    this.processes = new Map();
    this.projectManager = null;
  }

  async start() {
    console.log(`🚀 Starting ${this.agencyName}...`);

    try {
      // Load agency config
      const configPath = path.join(__dirname, 'Agencies', this.agencyName, 'agency.json');
      const config = await import(`file://${configPath}`, {
        assert: { type: 'json' }
      });

      console.log(`📋 Loaded config for ${this.agencyName}`);
      console.log(`   Description: ${config.default.description}`);
      console.log(`   Agents: ${config.default.agents.map(a => a.name).join(', ')}`);

      // Start Project Manager
      await this.startProjectManager();

      // Start each agent as separate process
      for (const agentConfig of config.default.agents) {
        await this.startAgent(agentConfig);
      }

      console.log(`✅ ${this.agencyName} fully operational`);

      // Keep alive
      this.keepAlive();

    } catch (error) {
      console.error(`❌ Failed to start ${this.agencyName}:`, error.message);
      process.exit(1);
    }
  }

  async startProjectManager() {
    console.log(`🏢 Starting Project Manager...`);

    const pmPath = path.join(__dirname, 'Agencies', this.agencyName, 'ProjectManager.js');

    // Import and initialize PM
    const { default: ProjectManager } = await import(`file://${pmPath}`);
    this.projectManager = new ProjectManager();
    await this.projectManager.initialize();

    console.log(`✅ Project Manager initialized`);
  }

  async startAgent(agentConfig) {
    console.log(`🤖 Starting agent: ${agentConfig.name}...`);

    const agentPath = path.join(__dirname, 'Agencies', this.agencyName, `${agentConfig.name}.js`);

    // Each agent runs as a child process
    const agentProcess = spawn('node', [agentPath], {
      env: {
        ...process.env,
        AGENT_NAME: agentConfig.name,
        AGENCY_NAME: this.agencyName
      },
      stdio: ['inherit', 'inherit', 'inherit']
    });

    this.processes.set(agentConfig.name, agentProcess);

    agentProcess.on('exit', (code) => {
      console.log(`⚠️  Agent ${agentConfig.name} exited with code ${code}`);

      // Restart agent if it crashes
      if (code !== 0) {
        console.log(`🔄 Restarting ${agentConfig.name}...`);
        setTimeout(() => this.startAgent(agentConfig), 5000);
      }
    });

    console.log(`✅ Agent ${agentConfig.name} started (PID: ${agentProcess.pid})`);
  }

  keepAlive() {
    // Keep process alive and handle signals
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    console.log(`\n💚 ${this.agencyName} is running. Press Ctrl+C to stop.\n`);
  }

  async shutdown() {
    console.log(`\n🛑 Shutting down ${this.agencyName}...`);

    // Kill all agent processes
    for (const [name, process] of this.processes) {
      console.log(`  Stopping ${name}...`);
      process.kill();
    }

    // Close Project Manager
    if (this.projectManager && this.projectManager.close) {
      await this.projectManager.close();
    }

    console.log(`✅ ${this.agencyName} shut down gracefully`);
    process.exit(0);
  }
}

// Start the runner
const runner = new AgencyRunner(AGENCY_NAME);
runner.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Orchestrator - Routes to local agencies
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Orchestrator {
  constructor() {
    this.agencies = new Map();
    this.agencyConfigs = new Map();
    this.routingHistory = [];
    this.initialized = false;
  }

  // Initialize and discover agencies
  async initialize() {
    if (this.initialized) return;

    console.log('🚀 Initializing Orchestrator...');

    try {
      // Auto-discover agencies
      await this.discoverAgencies();

      this.initialized = true;
      console.log(`✅ Orchestrator initialized with ${this.agencies.size} agencies`);
    } catch (error) {
      console.error('❌ Orchestrator initialization failed:', error.message);
      throw error;
    }
  }

  // NOTE: duplicate initialize() removed to avoid overwriting the primary initializer.

  // Auto-discover agencies from Agencies directory
  async discoverAgencies() {
    const agenciesDir = path.join(__dirname, 'Agencies');

    try {
      const entries = await fs.readdir(agenciesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadAgency(entry.name);
        }
      }
    } catch (error) {
      console.error('Error discovering agencies:', error.message);
    }
  }

  // Load a specific agency
  async loadAgency(agencyName) {
    const agencyPath = path.join(__dirname, 'Agencies', agencyName);
    const configPath = path.join(agencyPath, 'agency.json');
    const pmPath = path.join(agencyPath, 'ProjectManager.js');

    try {
      // Load agency config
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      this.agencyConfigs.set(agencyName, config);

      // Load Project Manager (use file:// protocol for dynamic import)
      const pmUrl = `file://${pmPath}`;
      const { default: ProjectManager } = await import(pmUrl);
      const pm = new ProjectManager();

      this.agencies.set(agencyName, pm);

      console.log(`✅ Loaded agency: ${agencyName}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Agents: ${config.agents.map(a => a.name).join(', ')}`);

    } catch (error) {
      console.warn(`⚠️  Could not load agency ${agencyName}:`, error.message);
    }
  }

  // Register an agency manually
  registerAgency(name, projectManager, config = null) {
    console.log(`📝 Registering agency: ${name}`);
    this.agencies.set(name, projectManager);

    if (config) {
      this.agencyConfigs.set(name, config);
    }
  }

  // Receive request from voice/chat agent
  async receiveRequest(request) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`\n📨 orchestrator received request: ${request}`);

    // Determine which agency should handle this
    const targetAgency = await this.determineAgency(request);

    if (!targetAgency) {
      throw new Error(`No suitable agency found for request: ${request}`);
    }

    // Route to the appropriate agency
    return await this.routeToAgency(targetAgency, request);
  }

  // Determine which agency should handle the request using AI
  async determineAgency(request) {
    const requestLower = request.toLowerCase();

    // Score each agency based on capabilities and keywords
    const scores = new Map();

    for (const [name, config] of this.agencyConfigs) {
      let score = 0;

      // Check keywords
      if (config.keywords) {
        for (const keyword of config.keywords) {
          if (requestLower.includes(keyword.toLowerCase())) {
            score += 2;
          }
        }
      }

      // Check capabilities
      if (config.capabilities) {
        for (const capability of config.capabilities) {
          if (requestLower.includes(capability.toLowerCase())) {
            score += 3;
          }
        }
      }

      // Check purpose
      if (config.purpose && requestLower.includes(config.purpose.toLowerCase())) {
        score += 5;
      }

      if (score > 0) {
        scores.set(name, score);
      }
    }

    // Return agency with highest score
    if (scores.size > 0) {
      const [topAgency] = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1]);

      console.log(`🎯 Selected agency: ${topAgency[0]} (score: ${topAgency[1]})`);
      return topAgency[0];
    }

    // Fallback to BuildingAgency if no match
    if (this.agencies.has('BuildingAgency')) {
      console.log(`🎯 Falling back to BuildingAgency (no specific match)`);
      return 'BuildingAgency';
    }

    // Return first available agency
    const firstAgency = Array.from(this.agencies.keys())[0];
    console.log(`🎯 Using first available agency: ${firstAgency}`);
    return firstAgency;
  }

  // Route request to specific agency
  async routeToAgency(agencyName, request) {
    console.log(`\n🔀 Routing to ${agencyName}: ${request.substring(0, 100)}...`);

    const agency = this.agencies.get(agencyName);
    if (!agency) {
      throw new Error(`Agency ${agencyName} not found`);
    }

    // Record routing
    const routing = {
      from: 'orchestrator',
      to: agencyName,
      request,
      timestamp: new Date().toISOString()
    };

    this.routingHistory.push(routing);

    // Send to Project Manager
    try {
      const result = await agency.receivePrompt(request);

      routing.status = 'success';
      routing.result = result;
      routing.duration = Date.now() - new Date(routing.timestamp).getTime();

      console.log(`\n✅ ${agencyName} completed task successfully`);

      return {
        agency: agencyName,
        ...result
      };

    } catch (error) {
      routing.status = 'error';
      routing.error = error.message;

      console.error(`\n❌ ${agencyName} failed:`, error.message);

      throw error;
    }
  }

  // Get list of registered agencies
  getAgencies() {
    return Array.from(this.agencies.keys());
  }

  // Get agency details
  getAgencyDetails(agencyName) {
    const config = this.agencyConfigs.get(agencyName);
    const agency = this.agencies.get(agencyName);

    if (!config) {
      return null;
    }

    return {
      name: agencyName,
      description: config.description,
      purpose: config.purpose,
      agents: config.agents.map(a => a.name),
      capabilities: config.capabilities,
      keywords: config.keywords,
      loaded: !!agency
    };
  }

  // List all agencies with details
  listAgencies() {
    console.log('\n🏢 Available Agencies:');

    for (const agencyName of this.agencies.keys()) {
      const details = this.getAgencyDetails(agencyName);

      if (details) {
        console.log(`\n  ${details.name}`);
        console.log(`    ${details.description}`);
        console.log(`    Purpose: ${details.purpose}`);
        console.log(`    Agents: ${details.agents.join(', ')}`);
        console.log(`    Capabilities: ${details.capabilities.slice(0, 5).join(', ')}${details.capabilities.length > 5 ? '...' : ''}`);
      }
    }
  }

  // Get routing history
  getRoutingHistory(limit = 10) {
    return this.routingHistory.slice(-limit);
  }

  // Get statistics
  getStats() {
    const totalRoutings = this.routingHistory.length;
    const successfulRoutings = this.routingHistory.filter(r => r.status === 'success').length;
    const failedRoutings = this.routingHistory.filter(r => r.status === 'error').length;

    const routingsByAgency = {};
    for (const routing of this.routingHistory) {
      if (!routingsByAgency[routing.to]) {
        routingsByAgency[routing.to] = 0;
      }
      routingsByAgency[routing.to]++;
    }

    return {
      totalAgencies: this.agencies.size,
      totalRoutings,
      successfulRoutings,
      failedRoutings,
      successRate: totalRoutings > 0
        ? ((successfulRoutings / totalRoutings) * 100).toFixed(2) + '%'
        : '0%',
      routingsByAgency,
      lastRouting: this.routingHistory[this.routingHistory.length - 1]
    };
  }

  // Check if agency exists
  hasAgency(name) {
    return this.agencies.has(name);
  }

  // Remove agency
  removeAgency(name) {
    const removed = this.agencies.delete(name);
    if (removed) {
      this.agencyConfigs.delete(name);
      console.log(`🗑️  Agency ${name} removed`);
    }
    return removed;
  }

  // Get status
  getStatus() {
    return {
      initialized: this.initialized,
      agencies: this.getAgencies(),
      stats: this.getStats()
    };
  }

  // Close all agencies
  async closeAll() {
    console.log('🔌 Closing all agencies...');

    for (const [name, agency] of this.agencies) {
      try {
        if (agency.close) {
          await agency.close();
          console.log(`  ✅ Closed ${name}`);
        }
      } catch (error) {
        console.error(`  ❌ Error closing ${name}:`, error.message);
      }
    }

    this.agencies.clear();
    this.agencyConfigs.clear();
    this.initialized = false;

    console.log('✅ All agencies closed');
  }
}

export default Orchestrator;

// CLI interface for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new Orchestrator();

  async function main() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    try {
      await orchestrator.initialize();

      switch (command) {
        case 'list':
          orchestrator.listAgencies();
          break;

        case 'route':
          const request = args.join(' ');
          if (!request) {
            console.log('Usage: node orchestrator.js route <request>');
            break;
          }

          const result = await orchestrator.receiveRequest(request);
          console.log('\n📊 Result:', JSON.stringify(result, null, 2));
          break;

        case 'stats':
          const stats = orchestrator.getStats();
          console.log('\n📊 Statistics:', JSON.stringify(stats, null, 2));
          break;

        case 'agency':
          const agencyName = args[0];
          if (!agencyName) {
            console.log('Usage: node orchestrator.js agency <name>');
            break;
          }

          const details = orchestrator.getAgencyDetails(agencyName);
          if (details) {
            console.log('\n📋 Agency Details:', JSON.stringify(details, null, 2));
          } else {
            console.log(`❌ Agency ${agencyName} not found`);
          }
          break;

        default:
          console.log(`
Orchestrator CLI

Commands:
  list                    List all available agencies
  route <request>         Route a request to appropriate agency
  stats                   Show routing statistics
  agency <name>           Show agency details

Examples:
  node orchestrator.js list
  node orchestrator.js route "Build a React dashboard"
  node orchestrator.js stats
  node orchestrator.js agency WebDevAgency
          `);
      }

      await orchestrator.closeAll();

    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }

  main();
}

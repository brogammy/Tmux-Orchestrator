#!/usr/bin/env node

// Demo: User Interaction with Chat Agent
// Simulates a user from tmux window interacting with the GUI chat agent

const ChatAgent = require('./chatAgent/index.js');
const Orchestrator = require('./orchestrator.js');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function userMessage(message) {
  log(`\n👤 USER: ${message}`, 'cyan');
}

function systemMessage(message) {
  log(`🤖 SYSTEM: ${message}`, 'green');
}

function agencyMessage(agency, message) {
  log(`🏢 ${agency}: ${message}`, 'yellow');
}

function separator() {
  log('\n' + '─'.repeat(80), 'gray');
}

async function demonstrateInteraction() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'bright');
  log('║        Tmux-Orchestrator: User Interaction Demo               ║', 'bright');
  log('║        OpenCode Integration with Free/Paid Models             ║', 'bright');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'bright');

  // Initialize system
  systemMessage('Initializing Orchestrator...');
  const orchestrator = new Orchestrator();
  await orchestrator.initialize();

  systemMessage('Starting Chat Agent interface...');
  const chatAgent = new ChatAgent(orchestrator);
  chatAgent.start();

  separator();
  log('Chat Agent ready! Type your orchestrator directives below:', 'bright');
  separator();

  // Simulation 1: Simple task
  userMessage(`"You are the Orchestrator. Set up project managers for:
1. General (Python) - Create a hello world function
Schedule yourself to check in when complete."`);

  separator();
  systemMessage('Processing your directive...');

  try {
    const result1 = await chatAgent.receiveTextInput(
      'Create a hello world function in Python'
    );

    systemMessage('Task routed to BuildingAgency');
    agencyMessage('BuildingAgency PM', 'Analyzing task complexity...');
    agencyMessage('BuildingAgency PM', 'Selected qwen-coder (free) for simple implementation');
    agencyMessage('CodeAgent', 'Executing with qwen-coder (free)...');

    log('\n📊 Result Summary:', 'magenta');
    log(`  Agency: ${result1.agency}`, 'dim');
    log(`  Status: Completed`, 'dim');
    log(`  Models Used: qwen-coder (free)`, 'dim');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'yellow');
  }

  separator();
  await sleep(1000);

  // Simulation 2: Complex web development task
  userMessage(`"You are the Orchestrator. Set up project managers for:
1. Frontend (React app) - Build user dashboard with authentication
2. Backend (FastAPI) - Create REST API with JWT auth
3. Database (PostgreSQL) - Design user and session schemas
Schedule yourself to check in every 3 hours."`);

  separator();
  systemMessage('Processing your directive...');
  systemMessage('Analyzing multi-domain task...');

  try {
    // Simulate Frontend task
    userMessage('Build React dashboard with authentication');

    systemMessage('Routing to WebDevAgency...');
    const result2 = await chatAgent.receiveTextInput(
      'Build React dashboard with authentication'
    );

    agencyMessage('WebDevAgency PM', 'Analyzing task: Complex frontend implementation');
    agencyMessage('WebDevAgency PM', 'Selected claude-sonnet (paid) for FrontendAgent');
    agencyMessage('FrontendAgent', 'Executing with claude-sonnet (paid)...');

    log('\n📊 Frontend Result:', 'magenta');
    log(`  Agency: ${result2.agency}`, 'dim');
    log(`  Model Selected: claude-sonnet (paid)`, 'dim');
    log(`  Reason: Complex UI with authentication flow`, 'dim');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'yellow');
  }

  separator();
  await sleep(1000);

  // Simulation 3: Backend API task
  userMessage('Create FastAPI REST API with JWT authentication');

  separator();
  systemMessage('Processing backend task...');

  try {
    const result3 = await chatAgent.receiveTextInput(
      'Create FastAPI REST API with JWT authentication'
    );

    systemMessage('Routing to BackendAgency (if available) or BuildingAgency...');
    agencyMessage('Agency PM', 'Analyzing task: Complex security implementation');
    agencyMessage('Agency PM', 'Selected claude-sonnet (paid) for security-critical code');

    // Simulate rate limit and fallback
    log('\n⚠️  RATE LIMIT DETECTED', 'yellow');
    systemMessage('Claude Sonnet rate limited (429)');
    systemMessage('Activating automatic fallback...');
    agencyMessage('Agency PM', 'Falling back to deepseek-coder (free)');
    agencyMessage('BackendAgent', 'Executing with deepseek-coder (free)...');

    log('\n📊 Backend Result:', 'magenta');
    log(`  Agency: ${result3.agency}`, 'dim');
    log(`  Primary Model: claude-sonnet (paid) - RATE LIMITED`, 'dim');
    log(`  Fallback Model: deepseek-coder (free) - SUCCESS ✓`, 'dim');
    log(`  Task Completed: Yes`, 'dim');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'yellow');
  }

  separator();
  await sleep(1000);

  // Simulation 4: Database schema design
  userMessage('Design PostgreSQL schema for users and sessions');

  separator();
  systemMessage('Processing database task...');

  try {
    const result4 = await chatAgent.receiveTextInput(
      'Design PostgreSQL schema for users and sessions'
    );

    agencyMessage('Agency PM', 'Analyzing task: Database schema design');
    agencyMessage('Agency PM', 'Selected qwen-coder (free) for standard schema');
    agencyMessage('DatabaseAgent', 'Executing with qwen-coder (free)...');

    log('\n📊 Database Result:', 'magenta');
    log(`  Agency: ${result4.agency}`, 'dim');
    log(`  Model Selected: qwen-coder (free)`, 'dim');
    log(`  Reason: Standard schema design, no complex optimizations`, 'dim');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'yellow');
  }

  separator();
  await sleep(1000);

  // Show statistics
  log('\n📈 SESSION STATISTICS', 'bright');
  separator();

  const stats = orchestrator.getStats();
  log(`Total Agencies: ${stats.totalAgencies}`, 'dim');
  log(`Total Tasks Routed: ${stats.totalRoutings}`, 'dim');
  log(`Success Rate: ${stats.successRate}`, 'dim');
  log(``, 'dim');
  log(`Routing Distribution:`, 'dim');
  for (const [agency, count] of Object.entries(stats.routingsByAgency)) {
    log(`  ${agency}: ${count} tasks`, 'dim');
  }

  separator();

  // Show model usage summary
  log('\n💰 MODEL USAGE SUMMARY', 'bright');
  separator();
  log(`Free Models Used:`, 'green');
  log(`  - qwen-coder (free): 2 tasks`, 'dim');
  log(`  - deepseek-coder (free): 1 task (fallback)`, 'dim');
  log(``, 'dim');
  log(`Paid Models Used:`, 'yellow');
  log(`  - claude-sonnet (paid): 1 task`, 'dim');
  log(`  - claude-sonnet (paid): 1 task FAILED (rate limit)`, 'dim');
  log(``, 'dim');
  log(`Cost Optimization: 75% free model usage`, 'green');
  log(`Fallback Success Rate: 100%`, 'green');

  separator();
  log('\n✅ Demo completed successfully!\n', 'bright');

  // Cleanup
  await orchestrator.closeAll();
  chatAgent.stop();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demonstration
if (require.main === module) {
  demonstrateInteraction().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

module.exports = { demonstrateInteraction };

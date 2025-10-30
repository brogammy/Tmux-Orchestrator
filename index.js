#!/usr/bin/env node

// Main entry point for the new architecture
// Integrates all components: chatAgent -> orchestrator -> BuildingAgency

const Orchestrator = require('./orchestrator');
const ChatAgent = require('./chatAgent/index');
const ProjectManager = require('./Agencies/BuildingAgency/ProjectManager');
const CodeAgent = require('./Agencies/BuildingAgency/CodeAgent');
const CodeValidator = require('./Agencies/BuildingAgency/CodeValidator');
const ExecutionEnvironment = require('./Agencies/BuildingAgency/executionEnvironment');

class SystemOrchestrator {
  constructor() {
    this.orchestrator = null;
    this.chatAgent = null;
    this.buildingAgency = null;
    this.isRunning = false;
  }

  // Initialize the entire system
  async initialize() {
    console.log('Initializing new architecture system...');
    
    try {
      // 1. Create orchestrator
      this.orchestrator = new Orchestrator();
      
      // 2. Create BuildingAgency components
      const projectManager = new ProjectManager();
      const codeAgent = new CodeAgent();
      const codeValidator = new CodeValidator();
      const executionEnvironment = new ExecutionEnvironment();
      
      // 3. Connect BuildingAgency components
      projectManager.agents.CodeAgent = codeAgent;
      projectManager.agents.CodeValidator = codeValidator;
      projectManager.agents.executionEnvironment = executionEnvironment;
      
      // 4. Register BuildingAgency with orchestrator
      this.orchestrator.registerAgency('BuildingAgency', projectManager);
      
      // 5. Create and connect chat agent
      this.chatAgent = new ChatAgent(this.orchestrator);
      
      // 6. Start chat agent
      this.chatAgent.start();
      
      this.isRunning = true;
      
      console.log('✅ System initialized successfully');
console.log('🏗️  BuildingAgency registered with Project Manager and 3 agents');
    console.log('💬 Chat agent ready for input');
    console.log('🔀 Orchestrator routing active');
      
      return true;
      
    } catch (error) {
      console.error('❌ System initialization failed:', error.message);
      throw error;
    }
  }

  // Start the main system loop
  async start() {
    if (!this.isRunning) {
      await this.initialize();
    }
    
    console.log('\n🚀 System started - Ready for input');
    console.log('Commands:');
    console.log('  Type your request and press Enter');
    console.log('  "status" - Show system status');
    console.log('  "history" - Show conversation history');
    console.log('  "quit" - Shutdown system');
    console.log('');
    
    // Simple command line interface for testing
    // In production, this would be the execution environment UI
    this.startCLI();
  }

  // Command line interface for testing
  startCLI() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const askQuestion = () => {
      rl.question('💬 You: ', async (input) => {
        if (input.toLowerCase() === 'quit') {
          await this.shutdown();
          rl.close();
          return;
        }
        
        if (input.toLowerCase() === 'status') {
          this.showStatus();
          askQuestion();
          return;
        }
        
        if (input.toLowerCase() === 'history') {
          this.showHistory();
          askQuestion();
          return;
        }
        
        if (input.trim() === '') {
          askQuestion();
          return;
        }
        
        try {
          // Send input through chat agent
          const result = await this.chatAgent.receiveTextInput(input);
          console.log('🤖 System:', JSON.stringify(result, null, 2));
        } catch (error) {
          console.log('❌ Error:', error.message);
        }
        
        askQuestion();
      });
    };
    
    askQuestion();
  }

  // Show system status
  showStatus() {
    console.log('\n📊 System Status:');
    console.log('  Running:', this.isRunning);
    console.log('  Chat Agent:', this.chatAgent ? '✅ Active' : '❌ Inactive');
  console.log('  Orchestrator:', this.orchestrator ? '✅ Active' : '❌ Inactive');
  console.log('  Registered Agencies:', this.orchestrator ? this.orchestrator.getAgencies() : []);
    console.log('');
  }

  // Show conversation history
  showHistory() {
    const history = this.chatAgent ? this.chatAgent.getHistory() : [];
    console.log('\n📜 Conversation History:');
    
    if (history.length === 0) {
      console.log('  No history yet');
    } else {
      history.forEach((msg, index) => {
        const icon = msg.type === 'user' ? '💬' : msg.type === 'error' ? '❌' : '🤖';
        console.log(`  ${index + 1}. ${icon} [${msg.type}] ${msg.content}`);
      });
    }
    console.log('');
  }

  // Shutdown the system
  async shutdown() {
    console.log('\n🛑 Shutting down system...');
    
    if (this.chatAgent) {
      this.chatAgent.stop();
    }
    
    this.isRunning = false;
    console.log('✅ System shutdown complete');
  }
}

// Start the system if this file is run directly
if (require.main === module) {
  const system = new SystemOrchestrator();
  
  system.start().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SystemOrchestrator;
#!/usr/bin/env node

// Chat Agent - Main entry point for user interaction
// Receives text/voice input from GUI
// Passes directives to Orchestrator
// Outside all agencies - user-facing interface

import Orchestrator from './orchestrator.js';
import readline from 'readline';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';

class ChatAgent {
  constructor() {
    this.orchestrator = new Orchestrator();
    this.conversationHistory = [];
    this.isActive = false;
    this.voiceEnabled = false;
    this.isRecording = false;
    this.planMode = false; // Toggle for plan mode
    this.executionEnvironment = null; // Reference to execution environment
  }

  // Initialize chat agent and orchestrator
  async initialize() {
    console.log('🤖 Chat Agent initializing...');
    await this.orchestrator.initialize();
    this.isActive = true;
    console.log('✅ Chat Agent ready!');
  }

  // Toggle plan mode
  togglePlanMode() {
    this.planMode = !this.planMode;
    const modeText = this.planMode ? 'PLAN MODE (planning only, no execution)' : 'BUILD MODE (executing tasks)';
    console.log(`\n🔄 Switched to ${modeText}`);
    return this.planMode;
  }

  // Receive user input (text or voice)
  async receiveInput(input, type = 'text') {
    if (!this.isActive) {
      await this.initialize();
    }

    const modeIndicator = this.planMode ? '📋 PLAN' : '🏗️  BUILD';
    console.log(`\n👤 USER (${type}) [${modeIndicator}]: ${input}`);

    // Record in history
    this.conversationHistory.push({
      type: 'user',
      content: input,
      inputType: type,
      planMode: this.planMode,
      timestamp: new Date().toISOString()
    });

    try {
      if (this.planMode) {
        // PLAN MODE: Just discuss, don't execute
        console.log('\n📋 PLAN MODE: Analyzing directive without execution...\n');

        const plan = await this.analyzeDirective(input);

        // Record response
        this.conversationHistory.push({
          type: 'plan',
          content: plan,
          timestamp: new Date().toISOString()
        });

        // Display plan
        this.displayPlan(plan);

        return { mode: 'plan', plan };

      } else {
        // BUILD MODE: Execute with orchestrator
        console.log('\n🏗️  BUILD MODE: Executing directive...\n');

        const result = await this.orchestrator.receiveDirective(input);

        // Record response
        this.conversationHistory.push({
          type: 'system',
          content: result,
          timestamp: new Date().toISOString()
        });

        // Display results
        this.displayResults(result);

        return { mode: 'build', result };
      }

    } catch (error) {
      console.error(`❌ Chat Agent error: ${error.message}`);

      this.conversationHistory.push({
        type: 'error',
        content: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  // Analyze directive in plan mode (don't execute)
  async analyzeDirective(input) {
    console.log('🤔 Analyzing your directive...');

    // Parse the directive
    const tasks = this.orchestrator.parseDirective(input);

    const plan = {
      directive: input,
      tasksIdentified: tasks.length,
      tasks: tasks.map(task => ({
        domain: task.domain,
        technology: task.technology,
        description: task.description,
        suggestedAgency: this.orchestrator.selectAgencyForTask(task),
        estimatedComplexity: this.estimateComplexity(task.description),
        suggestedModels: this.suggestModels(task.description)
      })),
      totalEstimatedTime: `${tasks.length * 5}-${tasks.length * 15} minutes`,
      recommendedApproach: this.recommendApproach(tasks)
    };

    return plan;
  }

  // Estimate task complexity
  estimateComplexity(description) {
    const descLower = description.toLowerCase();

    if (descLower.includes('simple') || descLower.includes('hello world') || descLower.includes('basic')) {
      return 'Low';
    }

    if (descLower.includes('complex') || descLower.includes('architecture') || descLower.includes('security')) {
      return 'High';
    }

    return 'Medium';
  }

  // Suggest models for task
  suggestModels(description) {
    const complexity = this.estimateComplexity(description);

    if (complexity === 'High') {
      return ['opencode-sonnet (paid)', 'fallback: deepseek-coder (free)'];
    } else if (complexity === 'Low') {
      return ['qwen-coder (free)', 'phi-3 (free)'];
    } else {
      return ['qwen-coder (free)', 'fallback: opencode-haiku (paid)'];
    }
  }

  // Recommend approach
  recommendApproach(tasks) {
    if (tasks.length === 1) {
      return 'Single task - can be completed in one session';
    } else if (tasks.length <= 3) {
      return 'Multiple tasks - recommend sequential execution with validation between each';
    } else {
      return 'Complex multi-task directive - consider breaking into smaller phases';
    }
  }

  // Display plan
  displayPlan(plan) {
    console.log('\n' + '='.repeat(80));
    console.log('📋 EXECUTION PLAN (NOT EXECUTED)');
    console.log('='.repeat(80));

    console.log(`\n📊 Summary:`);
    console.log(`   Tasks identified: ${plan.tasksIdentified}`);
    console.log(`   Estimated time: ${plan.totalEstimatedTime}`);
    console.log(`   Approach: ${plan.recommendedApproach}`);

    console.log(`\n📝 Task Breakdown:`);
    plan.tasks.forEach((task, i) => {
      console.log(`\n   ${i + 1}. ${task.domain} (${task.technology}) - ${task.description}`);
      console.log(`      Agency: ${task.suggestedAgency || 'TBD'}`);
      console.log(`      Complexity: ${task.estimatedComplexity}`);
      console.log(`      Models: ${task.suggestedModels.join(', ')}`);
    });

    console.log(`\n💡 To execute this plan, switch to BUILD MODE with 'build' command`);
    console.log('='.repeat(80) + '\n');
  }

  // Display results to user
  displayResults(result) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));

    for (const taskResult of result.results) {
      if (taskResult.status === 'completed') {
        console.log(`\n✅ ${taskResult.task.fullLine}`);
        console.log(`   Agency: ${taskResult.agency}`);
        console.log(`   Status: Completed`);

        if (taskResult.result.modelSelections) {
          console.log(`   Models used:`);
          for (const selection of taskResult.result.modelSelections) {
            console.log(`     - ${selection.agent}: ${selection.model} (${selection.tier})`);
          }
        }
      } else {
        console.log(`\n❌ ${taskResult.task.fullLine}`);
        console.log(`   Error: ${taskResult.error}`);
      }
    }

    console.log('\n' + '='.repeat(80));
  }

  // Enable voice input
  async enableVoice() {
    console.log('🎤 Checking voice capabilities...');

    // Check if whisper.cpp is available
    try {
      const whisper = spawn('which', ['whisper']);
      await new Promise((resolve, reject) => {
        whisper.on('close', (code) => {
          if (code === 0) {
            this.voiceEnabled = true;
            console.log('✅ Voice enabled (using whisper.cpp)');
            resolve();
          } else {
            console.log('⚠️  whisper.cpp not found, voice disabled');
            console.log('   Install: brew install whisper-cpp (macOS) or see docs');
            resolve();
          }
        });
      });
    } catch (error) {
      console.log('⚠️  Voice input not available');
    }
  }

  // Record voice input
  async recordVoice(duration = 5) {
    if (!this.voiceEnabled) {
      throw new Error('Voice not enabled. Install whisper.cpp first.');
    }

    console.log(`🎤 Recording for ${duration} seconds... SPEAK NOW!`);
    this.isRecording = true;

    const audioFile = `/tmp/voice-input-${Date.now()}.wav`;

    // Record audio using sox
    return new Promise((resolve, reject) => {
      const rec = spawn('rec', [
        '-r', '16000',  // Sample rate
        '-c', '1',      // Mono
        '-b', '16',     // Bit depth
        audioFile,
        'trim', '0', duration.toString()
      ]);

      rec.on('close', (code) => {
        this.isRecording = false;
        if (code === 0) {
          console.log('✅ Recording complete');
          resolve(audioFile);
        } else {
          reject(new Error('Recording failed'));
        }
      });

      rec.on('error', (error) => {
        this.isRecording = false;
        reject(error);
      });
    });
  }

  // Transcribe audio to text
  async transcribeAudio(audioFile) {
    console.log('🔄 Transcribing audio...');

    return new Promise((resolve, reject) => {
      const whisper = spawn('whisper', [
        audioFile,
        '--model', 'base',
        '--output-format', 'txt'
      ]);

      let output = '';

      whisper.stdout.on('data', (data) => {
        output += data.toString();
      });

      whisper.on('close', async (code) => {
        // Clean up audio file
        try {
          await unlink(audioFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code === 0) {
          // Extract transcribed text
          const transcription = output.trim();
          console.log(`✅ Transcribed: "${transcription}"`);
          resolve(transcription);
        } else {
          reject(new Error('Transcription failed'));
        }
      });

      whisper.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Receive voice input
  async receiveVoiceInput(duration = 5) {
    try {
      // Record audio
      const audioFile = await this.recordVoice(duration);

      // Transcribe to text
      const transcription = await this.transcribeAudio(audioFile);

      // Process as text input
      return await this.receiveInput(transcription, 'voice');

    } catch (error) {
      console.error(`❌ Voice input failed: ${error.message}`);
      throw error;
    }
  }

  // Start interactive mode
  async startInteractive() {
    await this.initialize();
    await this.enableVoice();

    console.log('\n' + '╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + 'TMUX ORCHESTRATOR CHAT AGENT' + ' '.repeat(30) + '║');
    console.log('║' + ' '.repeat(15) + 'OpenCode Integration with Free/Paid Models' + ' '.repeat(21) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');

    console.log('📝 Type your orchestrator directives below.');
    console.log('💡 Example: "You are the Orchestrator. Set up project managers for:');
    console.log('            1. Frontend (React) - Build dashboard');
    console.log('            2. Backend (FastAPI) - Create REST API');
    console.log('            Schedule yourself to check in every hour."\n');

    if (this.voiceEnabled) {
      console.log('🎤 Voice input enabled! Type "voice" to use microphone\n');
    }

    const currentMode = this.planMode ? '📋 PLAN MODE' : '🏗️  BUILD MODE';
    console.log(`Current Mode: ${currentMode} (toggle with 'plan' or 'build')`);
    console.log('Commands: exit, list, stats, history, plan, build' + (this.voiceEnabled ? ', voice' : '') + '\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '👤 YOU: '
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();

      if (!input) {
        rl.prompt();
        return;
      }

      // Handle special commands
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        console.log('\n👋 Closing Chat Agent...');
        await this.close();
        rl.close();
        process.exit(0);
      }

      if (input.toLowerCase() === 'list') {
        this.orchestrator.listAgencies();
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'stats') {
        const stats = this.orchestrator.getStats();
        console.log('\n📊 Statistics:', JSON.stringify(stats, null, 2));
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'history') {
        console.log('\n📜 Conversation History:');
        for (const msg of this.conversationHistory) {
          console.log(`  [${msg.timestamp}] ${msg.type}: ${typeof msg.content === 'string' ? msg.content : 'directive result'}`);
        }
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'plan') {
        this.planMode = true;
        console.log('\n📋 Switched to PLAN MODE');
        console.log('   - Directives will be analyzed without execution');
        console.log('   - Use "build" command to switch to BUILD MODE\n');
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'build') {
        this.planMode = false;
        console.log('\n🏗️  Switched to BUILD MODE');
        console.log('   - Directives will be executed by agencies');
        console.log('   - Use "plan" command to switch to PLAN MODE\n');
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'mode') {
        const currentMode = this.planMode ? '📋 PLAN MODE' : '🏗️  BUILD MODE';
        console.log(`\nCurrent Mode: ${currentMode}`);
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'voice' || input.toLowerCase() === 'mic') {
        if (!this.voiceEnabled) {
          console.log('❌ Voice input not enabled. Install whisper.cpp and sox');
          rl.prompt();
          return;
        }

        console.log('\n🎤 Voice input mode - starting recording...');
        rl.pause();

        try {
          await this.receiveVoiceInput(5);  // 5 second recording
        } catch (error) {
          console.error(`❌ Voice input error: ${error.message}`);
        }

        rl.resume();
        rl.prompt();
        return;
      }

      // Process as directive
      try {
        await this.receiveInput(input, 'text');
      } catch (error) {
        // Error already logged
      }

      rl.prompt();
    });

    rl.on('close', async () => {
      console.log('\n👋 Goodbye!');
      await this.close();
      process.exit(0);
    });
  }

  // Get conversation history
  getHistory() {
    return this.conversationHistory;
  }

  // Get status
  getStatus() {
    return {
      isActive: this.isActive,
      messageCount: this.conversationHistory.length,
      orchestratorStats: this.orchestrator.getStats()
    };
  }

  // Close chat agent
  async close() {
    console.log('🔌 Shutting down Chat Agent...');
    await this.orchestrator.closeAll();
    this.isActive = false;
    console.log('✅ Chat Agent closed');
  }
}

export default ChatAgent;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const chatAgent = new ChatAgent();

  // Check if directive passed as argument
  if (process.argv.length > 2) {
    const directive = process.argv.slice(2).join(' ');
    chatAgent.receiveInput(directive, 'text')
      .then(() => chatAgent.close())
      .catch((error) => {
        console.error('Error:', error.message);
        process.exit(1);
      });
  } else {
    // Start interactive mode
    chatAgent.startInteractive();
  }
}

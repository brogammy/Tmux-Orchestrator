// Chat Agent - Interface for voice/text communication
// Located at bottom of execution environment
// Passes requests to orchestrator

class ChatAgent {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.conversationHistory = [];
    this.isActive = false;
  }

  // Start the chat agent
  start() {
    console.log('Chat Agent started - ready for voice/text input');
    this.isActive = true;
  }

  // Stop the chat agent
  stop() {
    console.log('Chat Agent stopped');
    this.isActive = false;
  }

  // Receive input from user (voice or text)
  async receiveInput(input, type = 'text') {
    if (!this.isActive) {
      throw new Error('Chat Agent is not active');
    }
    
    console.log(`Chat Agent received ${type} input: ${input}`);
    
    // Record in conversation history
    const message = {
      type: 'user',
      content: input,
      inputType: type,
      timestamp: new Date().toISOString()
    };
    
    this.conversationHistory.push(message);
    
    try {
      // Pass to orchestrator
      const result = await this.sendToOrchestrator(input);
      
      // Record response
      const response = {
        type: 'system',
        content: result,
        timestamp: new Date().toISOString()
      };
      
      this.conversationHistory.push(response);
      
      return result;
      
    } catch (error) {
      console.error(`Chat Agent error: ${error.message}`);
      
      // Record error
      const errorMessage = {
        type: 'error',
        content: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.conversationHistory.push(errorMessage);
      
      throw error;
    }
  }

  // Send input to orchestrator
  async sendToOrchestrator(input) {
    console.log('Chat Agent sending to orchestrator...');
    
    if (!this.orchestrator) {
      throw new Error('Orchestrator not connected');
    }
    
    return await this.orchestrator.receiveRequest(input);
  }

  // Get conversation history
  getHistory() {
    return this.conversationHistory;
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
  }

  // Get current status
  getStatus() {
    return {
      isActive: this.isActive,
      messageCount: this.conversationHistory.length,
      lastMessage: this.conversationHistory[this.conversationHistory.length - 1],
      orchestratorConnected: !!this.orchestrator
    };
  }

  // Handle voice input
  async receiveVoiceInput(audioData) {
    console.log('Processing voice input...');
    
    // Would integrate with speech-to-text here
    // For now, simulate voice-to-text conversion
    const text = await this.convertSpeechToText(audioData);
    
    return await this.receiveInput(text, 'voice');
  }

  // Convert speech to text (placeholder)
  async convertSpeechToText(audioData) {
    // This would integrate with actual speech-to-text service
    console.log('Converting speech to text...');
    
    // Simulate conversion
    return "voice input converted to text";
  }

  // Handle text input
  async receiveTextInput(text) {
    return await this.receiveInput(text, 'text');
  }

  // Set orchestrator connection
  setOrchestrator(orchestrator) {
    this.orchestrator = orchestrator;
    console.log('Chat Agent connected to orchestrator');
  }
}

module.exports = ChatAgent;
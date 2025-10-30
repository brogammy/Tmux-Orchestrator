#!/usr/bin/env node

import { createOpencodeClient } from "@opencode-ai/sdk";

class OpenCodeIntegration {
    constructor() {
        this.client = null;
        this.sessionId = null;
        this.connected = false;
    }

    async connect() {
        try {
            this.client = createOpencodeClient({
                baseUrl: "http://localhost:4096"
            });

            // Test connection
            const config = await this.client.config.get();
            console.log("✅ Connected to OpenCode server");
            console.log("Available models:", Object.keys(config.providers || {}));
            
            this.connected = true;
            return true;
        } catch (error) {
            console.error("❌ Failed to connect to OpenCode:", error.message);
            return false;
        }
    }

    async createSession(title = "Tmux Orchestrator Session") {
        if (!this.connected) {
            throw new Error("Not connected to OpenCode server");
        }

        try {
            const session = await this.client.session.create({
                body: { title }
            });
            
            console.log("Session response:", JSON.stringify(session, null, 2));
            
            this.sessionId = session.data?.id || session.id || session.sessionId;
            console.log(`✅ Created session: ${this.sessionId}`);
            return session;
        } catch (error) {
            console.error("❌ Failed to create session:", error.message);
            throw error;
        }
    }

    async sendMessage(message, options = {}) {
        if (!this.sessionId) {
            throw new Error("No active session");
        }

        try {
            const response = await this.client.session.prompt({
                path: { id: this.sessionId },
                body: {
                    parts: [{ type: "text", text: message }],
                    ...options
                }
            });

            return response;
        } catch (error) {
            console.error("❌ Failed to send message:", error.message);
            throw error;
        }
    }

    async getSessionMessages() {
        if (!this.sessionId) {
            throw new Error("No active session");
        }

        try {
            const messages = await this.client.session.messages({
                path: { id: this.sessionId }
            });

            return messages;
        } catch (error) {
            console.error("❌ Failed to get messages:", error.message);
            throw error;
        }
    }

    async executeCommand(command) {
        if (!this.sessionId) {
            throw new Error("No active session");
        }

        try {
            const response = await this.client.session.shell({
                path: { id: this.sessionId },
                body: { command }
            });

            return response;
        } catch (error) {
            console.error("❌ Failed to execute command:", error.message);
            throw error;
        }
    }

    async listSessions() {
        if (!this.connected) {
            throw new Error("Not connected to OpenCode server");
        }

        try {
            const sessions = await this.client.session.list();
            return sessions;
        } catch (error) {
            console.error("❌ Failed to list sessions:", error.message);
            throw error;
        }
    }

    async close() {
        // OpenCode SDK doesn't have explicit close method
        this.connected = false;
        this.sessionId = null;
        console.log("🔌 Disconnected from OpenCode");
    }
}

// Export for use in other modules
export default OpenCodeIntegration;

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const integration = new OpenCodeIntegration();

    async function main() {
        const command = process.argv[2];
        const args = process.argv.slice(3);

        try {
            switch (command) {
                case 'connect':
                    await integration.connect();
                    break;

                case 'session':
                    await integration.connect();
                    const session = await integration.createSession(args[0]);
                    console.log("Session ID:", session.id);
                    break;

                case 'send':
                    await integration.connect();
                    await integration.createSession();
                    const message = args.join(' ');
                    const response = await integration.sendMessage(message);
                    console.log("Response:", response.parts?.[0]?.text || "No response");
                    break;

                case 'list':
                    await integration.connect();
                    const sessions = await integration.listSessions();
                    console.log("Active sessions:");
                    sessions.forEach(s => console.log(`  ${s.id}: ${s.title}`));
                    break;

                default:
                    console.log(`
Usage:
  node opencode_integration.js connect                    # Test connection
  node opencode_integration.js session [title]           # Create session
  node opencode_integration.js send "message"            # Send message
  node opencode_integration.js list                      # List sessions
                    `);
            }
        } catch (error) {
            console.error("Error:", error.message);
            process.exit(1);
        }
    }

    main();
}
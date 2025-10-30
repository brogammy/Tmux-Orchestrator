#!/usr/bin/env python3
"""
Tmux Orchestrator MCP Server

Provides Model Context Protocol tools for managing tmux sessions,
agent coordination, and real-time monitoring.
"""

import json
import sys
import subprocess
from typing import Dict, List, Optional, Any
from pathlib import Path
import asyncio
from datetime import datetime
import socket
import threading
import argparse

# Import existing orchestrator components
sys.path.append(str(Path(__file__).parent))
from tmux_utils import TmuxOrchestrator
from tools.message_bus import MessageBus

class TmuxMCPServer:
    """MCP Server for Tmux Orchestrator Management"""
    
    def __init__(self):
        self.orchestrator = TmuxOrchestrator()
        self.message_bus = MessageBus()
        self._existing_sessions = set()
        self._preserve_existing_sessions()
    
    def _preserve_existing_sessions(self):
        """Track existing sessions to prevent accidental closure"""
        try:
            result = subprocess.run(["tmux", "list-sessions", "-F", "#{session_name}"], 
                                  capture_output=True, text=True, check=True)
            for session in result.stdout.strip().split('\n'):
                if session:
                    self._existing_sessions.add(session)
        except:
            pass
        
    def list_sessions(self) -> Dict[str, Any]:
        """List all tmux sessions with detailed window information"""
        sessions = self.orchestrator.get_tmux_sessions()
        return {
            "sessions": [
                {
                    "name": session.name,
                    "attached": session.attached,
                    "windows": [
                        {
                            "index": window.window_index,
                            "name": window.window_name,
                            "active": window.active
                        }
                        for window in session.windows
                    ]
                }
                for session in sessions
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    def get_window_content(self, session_name: str, window_index: int, lines: int = 50) -> Dict[str, Any]:
        """Get content from a specific tmux window"""
        content = self.orchestrator.capture_window_content(session_name, window_index, lines)
        return {
            "session": session_name,
            "window": window_index,
            "content": content,
            "lines_captured": len(content.split('\n')) if content else 0,
            "timestamp": datetime.now().isoformat()
        }
    
    def send_to_window(self, session_name: str, window_index: int, command: str, 
                      confirm: bool = False) -> Dict[str, Any]:
        """Send command to specific tmux window"""
        success = self.orchestrator.send_command_to_window(
            session_name, window_index, command, confirm
        )
        return {
            "success": success,
            "session": session_name,
            "window": window_index,
            "command": command,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_agency_status(self) -> Dict[str, Any]:
        """Get status of all agencies and their agents"""
        try:
            with open("registry/active_agencies.json", 'r') as f:
                agencies = json.load(f)
            
            status = {
                "agencies": agencies.get("agencies", []),
                "message_queue_stats": self._get_queue_stats(),
                "tmux_snapshot": self.orchestrator.create_monitoring_snapshot(),
                "timestamp": datetime.now().isoformat()
            }
            return status
        except Exception as e:
            return {"error": str(e), "timestamp": datetime.now().isoformat()}
    
    def send_agency_message(self, from_agency: str, to_agency: str, 
                           msg_type: str, payload: Dict) -> Dict[str, Any]:
        """Send message between agencies"""
        try:
            msg_id = self.message_bus.send_message(from_agency, to_agency, msg_type, payload)
            return {
                "success": True,
                "message_id": msg_id,
                "from": from_agency,
                "to": to_agency,
                "type": msg_type,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_pending_messages(self, agency: str) -> Dict[str, Any]:
        """Get pending messages for an agency"""
        messages = self.message_bus.get_messages(agency, status="pending")
        return {
            "agency": agency,
            "pending_count": len(messages),
            "messages": messages,
            "timestamp": datetime.now().isoformat()
        }
    
    def create_agency_session(self, agency_name: str, agents: List[str]) -> Dict[str, Any]:
        """Create new tmux session for an agency with agent panels"""
        try:
            # Check if session already exists - preserve it
            result = subprocess.run(["tmux", "has-session", "-t", agency_name], 
                                  capture_output=True)
            if result.returncode == 0:
                return {
                    "success": True,
                    "agency": agency_name,
                    "agents": agents,
                    "session_existed": True,
                    "preserved": True,
                    "timestamp": datetime.now().isoformat()
                }
            
            # Create main agency session
            session_cmd = f"tmux new-session -d -s {agency_name}"
            subprocess.run(session_cmd, shell=True, check=True)
            
            # Create windows for each agent
            for i, agent in enumerate(agents):
                if i == 0:
                    # First agent uses main window
                    window_cmd = f"tmux rename-window -t {agency_name}:0 '{agent}'"
                else:
                    # Create new window for additional agents
                    window_cmd = f"tmux new-window -t {agency_name} -n '{agent}'"
                subprocess.run(window_cmd, shell=True, check=True)
            
            return {
                "success": True,
                "agency": agency_name,
                "agents": agents,
                "session_created": True,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def switch_to_session(self, session_name: str) -> Dict[str, Any]:
        """Switch to specific tmux session"""
        try:
            cmd = f"tmux attach-session -t {session_name}"
            subprocess.run(cmd, shell=True, check=True)
            return {
                "success": True,
                "session": session_name,
                "action": "attached",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _get_queue_stats(self) -> Dict[str, Any]:
        """Get message queue statistics"""
        try:
            queue = self.message_bus._load_queue()
            pending = len([m for m in queue["messages"] if m["status"] == "pending"])
            delivered = len([m for m in queue["messages"] if m["status"] == "delivered"])
            acknowledged = len([m for m in queue["messages"] if m["status"] == "acknowledged"])
            
            return {
                "total_messages": len(queue["messages"]),
                "pending": pending,
                "delivered": delivered,
                "acknowledged": acknowledged,
                "last_updated": queue.get("last_updated")
            }
        except Exception:
            return {"error": "Could not load queue stats"}

def handle_mcp_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """Handle MCP protocol requests"""
    server = TmuxMCPServer()
    
    method = request.get("method")
    params = request.get("params", {})
    request_id = request.get("id")
    
    try:
        if method == "tmux/list_sessions":
            result = server.list_sessions()
        elif method == "tmux/get_window_content":
            result = server.get_window_content(
                params["session"], params["window"], params.get("lines", 50)
            )
        elif method == "tmux/send_to_window":
            result = server.send_to_window(
                params["session"], params["window"], params["command"], 
                params.get("confirm", False)
            )
        elif method == "tmux/get_agency_status":
            result = server.get_agency_status()
        elif method == "tmux/send_agency_message":
            result = server.send_agency_message(
                params["from"], params["to"], params["type"], params["payload"]
            )
        elif method == "tmux/get_pending_messages":
            result = server.get_pending_messages(params["agency"])
        elif method == "tmux/create_agency_session":
            result = server.create_agency_session(params["agency"], params["agents"])
        elif method == "tmux/switch_to_session":
            result = server.switch_to_session(params["session"])
        else:
            result = {"error": f"Unknown method: {method}"}
        
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result
        }
    
    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32000, "message": str(e)}
        }

def main():
    """Main MCP server loop"""
    parser = argparse.ArgumentParser(description='Tmux Orchestrator MCP Server')
    parser.add_argument('--socket', help='Unix domain socket path to listen on (line-delimited JSON-RPC)')
    args = parser.parse_args()

    print("Tmux Orchestrator MCP Server starting...", file=sys.stderr)

    if args.socket:
        sock_path = args.socket

        # Ensure old socket removed
        try:
            Path(sock_path).unlink()
        except Exception:
            pass

        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.bind(sock_path)
        server.listen(5)

        def handle_client(conn):
            with conn:
                data = b''
                while True:
                    chunk = conn.recv(4096)
                    if not chunk:
                        break
                    data += chunk
                    # process lines
                    while b'\n' in data:
                        line, data = data.split(b'\n', 1)
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            request = json.loads(line.decode('utf-8'))
                            response = handle_mcp_request(request)
                        except Exception as e:
                            response = {
                                "jsonrpc": "2.0",
                                "id": request.get('id') if isinstance(request, dict) else None,
                                "error": {"code": -32603, "message": str(e)}
                            }
                        try:
                            conn.sendall((json.dumps(response) + '\n').encode('utf-8'))
                        except Exception:
                            return

        def accept_loop():
            try:
                while True:
                    conn, _ = server.accept()
                    t = threading.Thread(target=handle_client, args=(conn,))
                    t.daemon = True
                    t.start()
            finally:
                try:
                    server.close()
                except Exception:
                    pass

        print(f"MCP socket listening on {sock_path}", file=sys.stderr)
        try:
            accept_loop()
        except KeyboardInterrupt:
            pass
        return

    # Fallback: stdin loop (original behavior)
    for line in sys.stdin:
        try:
            request = json.loads(line.strip())
            response = handle_mcp_request(request)
            print(json.dumps(response), flush=True)
        except json.JSONDecodeError:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": "Parse error"}
            }
            print(json.dumps(error_response), flush=True)
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": f"Internal error: {str(e)}"}
            }
            print(json.dumps(error_response), flush=True)

if __name__ == "__main__":
    main()
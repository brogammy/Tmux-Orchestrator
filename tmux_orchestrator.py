#!/usr/bin/env python3
"""
Agent/Model Agnostic Tmux Orchestrator with Ollama & OpenCode Support

Creates and manages tmux sessions and panes, and can dispatch provider-specific
commands (ollama, ollama-cloud, opencode) to panes using a JSON configuration.

Usage:
  python3 tmux_orchestrator.py start --config tmux-config.json
  python3 tmux_orchestrator.py start --pull-models
  python3 tmux_orchestrator.py attach
  python3 tmux_orchestrator.py kill
  python3 tmux_orchestrator.py restart
"""

import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

try:
    import requests
except Exception:
    requests = None


class TmuxOrchestrator:
    def __init__(self, session_name: str, config: Dict):
        self.session_name = session_name
        self.config = config
        self.project_root = Path(config.get('project_root', '.')).resolve()
        self.providers = config.get('providers', {})
        self.default_provider = config.get('default_provider', 'opencode')

    def run_command(self, cmd: List[str], cwd: Optional[str] = None) -> subprocess.CompletedProcess:
        """Run a command and return the result"""
        return subprocess.run(
            cmd,
            cwd=cwd or str(self.project_root),
            capture_output=True,
            text=True
        )

    def session_exists(self) -> bool:
        """Check if tmux session exists"""
        result = self.run_command(['tmux', 'has-session', '-t', self.session_name])
        return result.returncode == 0

    def create_session(self) -> None:
        """Create new tmux session"""
        if self.session_exists():
            print(f"Session {self.session_name} already exists")
            return

        # Create session with first window
        first_window = self.config['windows'][0]['name']
        self.run_command([
            'tmux', 'new-session', '-d',
            '-s', self.session_name,
            '-n', first_window
        ])
        print(f"Created session: {self.session_name}")

    def setup_windows(self) -> None:
        """Setup all windows from config"""
        for i, window in enumerate(self.config['windows']):
            window_name = window['name']

            # Create window (skip first as it's created with session)
            if i > 0:
                self.run_command([
                    'tmux', 'new-window',
                    '-t', f'{self.session_name}:{i}',
                    '-n', window_name
                ])

            # Setup panes
            self.setup_panes(window, i)

    def setup_panes(self, window: Dict, window_index: int) -> None:
        """Setup panes in a window"""
        panes = window.get('panes', [])
        window_target = f'{self.session_name}:{window_index}'

        # Create additional panes (first pane already exists)
        for i in range(1, len(panes)):
            split_dir = '-h' if panes[i].get('split', 'horizontal') == 'vertical' else '-v'
            self.run_command([
                'tmux', 'split-window', split_dir,
                '-t', window_target
            ])

        # Send commands to each pane
        for i, pane_config in enumerate(panes):
            pane_target = f'{window_target}.{i}'
            commands = pane_config.get('commands', [])

            # Send each command with optional delay
            for cmd in commands:
                if isinstance(cmd, dict):
                    # Handle provider-specific commands
                    if 'provider' in cmd:
                        provider = cmd['provider']
                        if provider == 'ollama':
                            self.send_ollama_command(pane_target, cmd.get('ollama', {}))
                        elif provider == 'ollama-cloud':
                            self.send_ollama_cloud_command(pane_target, cmd.get('ollama-cloud', {}))
                        elif provider == 'opencode':
                            self.send_opencode_command(pane_target, cmd.get('opencode', {}))
                        else:
                            print(f"Unknown provider: {provider}")
                    else:
                        # Plain command object with 'command'
                        if 'command' in cmd:
                            self.send_command(pane_target, cmd['command'])
                        if 'delay' in cmd:
                            time.sleep(cmd['delay'])
                else:
                    self.send_command(pane_target, cmd)
                    time.sleep(0.1)  # Small delay between commands

    def send_command(self, pane_target: str, command: str) -> None:
        """Send command to specific pane"""
        self.run_command([
            'tmux', 'send-keys',
            '-t', pane_target,
            command, 'Enter'
        ])

    def send_opencode_command(self, pane_target: str, oc_config: Dict) -> None:
        """Send opencode CLI command to pane"""
        # Build opencode command with global and local options
        cmd_parts = ['opencode']

        # Add global opencode options
        global_opts = self.providers.get('opencode', {}).get('global_options', {})
        for key, value in global_opts.items():
            cmd_parts.extend([f'--{key}', str(value)])

        # Add command-specific options
        cmd_parts.append(oc_config.get('command', ''))

        cmd_opts = oc_config.get('options', {})
        for key, value in cmd_opts.items():
            if isinstance(value, bool) and value:
                cmd_parts.append(f'--{key}')
            elif value is not None:
                cmd_parts.extend([f'--{key}', str(value)])

        # Add arguments
        cmd_parts.extend(oc_config.get('args', []))

        # Send command
        self.send_command(pane_target, ' '.join([p for p in cmd_parts if p]))

    def send_ollama_command(self, pane_target: str, ollama_config: Dict) -> None:
        """Send Ollama CLI command to pane"""
        cmd_parts = ['ollama']

        # Add command
        if 'command' in ollama_config:
            cmd_parts.append(ollama_config['command'])

        # Add model if specified
        if 'model' in ollama_config:
            cmd_parts.append(ollama_config['model'])

        # Add prompt/file if specified
        if 'prompt' in ollama_config:
            cmd_parts.extend(['--prompt', ollama_config['prompt']])
        elif 'file' in ollama_config:
            cmd_parts.extend(['--file', ollama_config['file']])

        # Add other options
        options = ollama_config.get('options', {})
        for key, value in options.items():
            if isinstance(value, bool) and value:
                cmd_parts.append(f'--{key}')
            elif value is not None:
                cmd_parts.extend([f'--{key}', str(value)])

        # Send command
        self.send_command(pane_target, ' '.join(cmd_parts))

    def send_ollama_cloud_command(self, pane_target: str, cloud_config: Dict) -> None:
        """Send Ollama Cloud API command to pane (via curl)"""
        # Get provider config
        provider_config = self.providers.get('ollama-cloud', {})
        api_key = provider_config.get('api_key') or os.getenv('OLLAMA_CLOUD_API_KEY')
        base_url = provider_config.get('base_url', 'https://ollama.cloud/api')

        if not api_key:
            print("Ollama Cloud API key not found")
            return

        # Build curl command for API call
        cmd_parts = ['curl', '-s', '-X', 'POST']
        cmd_parts.extend(['-H', f'Authorization: Bearer {api_key}'])
        cmd_parts.extend(['-H', 'Content-Type: application/json'])

        # Build request data
        data = {
            'model': cloud_config.get('model', 'llama3'),
            'prompt': cloud_config.get('prompt', ''),
            'stream': cloud_config.get('stream', False)
        }

        # Add additional parameters
        for key in ['system', 'template', 'context', 'options']:
            if key in cloud_config:
                data[key] = cloud_config[key]

        cmd_parts.extend(['-d', json.dumps(data)])
        cmd_parts.append(f"{base_url}/generate")

        # Send command
        self.send_command(pane_target, ' '.join(cmd_parts))

    def attach_session(self) -> None:
        """Attach to the tmux session"""
        if not self.session_exists():
            print(f"Session {self.session_name} does not exist")
            return

        os.execvp('tmux', ['tmux', 'attach-session', '-t', self.session_name])

    def kill_session(self) -> None:
        """Kill the tmux session"""
        if self.session_exists():
            self.run_command(['tmux', 'kill-session', '-t', self.session_name])
            print(f"Killed session: {self.session_name}")


def load_config(config_path: str) -> Dict:
    """Load configuration from JSON file"""
    with open(config_path, 'r') as f:
        return json.load(f)


def check_ollama_installed() -> bool:
    """Check if Ollama is installed"""
    try:
        result = subprocess.run(['ollama', '--version'],
                                capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def pull_ollama_model(model: str) -> bool:
    """Pull an Ollama model if not present"""
    try:
        result = subprocess.run(['ollama', 'list'],
                                capture_output=True, text=True)
        if model in result.stdout:
            return True
        print(f"Pulling Ollama model: {model}")
        result = subprocess.run(['ollama', 'pull', model],
                                capture_output=True, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"Error pulling model {model}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Agent/Model Agnostic Tmux Orchestrator with Ollama Support')
    parser.add_argument('action', choices=['start', 'attach', 'kill', 'restart'])
    parser.add_argument('--config', default='tmux-config.json', help='Configuration file')
    parser.add_argument('--session', help='Session name (overrides config)')
    parser.add_argument('--pull-models', action='store_true', help='Pull required Ollama models')

    args = parser.parse_args()

    # Load configuration
    try:
        config = load_config(args.config)
    except Exception as e:
        print(f"Error loading config: {e}")
        sys.exit(1)

    # Check Ollama installation
    if args.pull_models or any('ollama' in str(window) for window in config.get('windows', [])):
        if not check_ollama_installed():
            print("Ollama is not installed. Please install it from https://ollama.com/")
            sys.exit(1)

        # Pull required models if requested
        if args.pull_models:
            ollama_models = config.get('ollama_models', [])
            for model in ollama_models:
                if not pull_ollama_model(model):
                    print(f"Failed to pull model: {model}")

    # Determine session name
    session_name = args.session or config.get('session_name', 'orchestrator')

    # Initialize orchestrator
    orchestrator = TmuxOrchestrator(session_name, config)

    # Perform action
    if args.action == 'start':
        orchestrator.create_session()
        orchestrator.setup_windows()
        print(f"Session {session_name} started")
    elif args.action == 'attach':
        orchestrator.attach_session()
    elif args.action == 'kill':
        orchestrator.kill_session()
    elif args.action == 'restart':
        orchestrator.kill_session()
        time.sleep(1)
        orchestrator.create_session()
        orchestrator.setup_windows()
        print(f"Session {session_name} restarted")


if __name__ == '__main__':
    main()

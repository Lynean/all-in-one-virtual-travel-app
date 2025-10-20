#!/usr/bin/env python3
"""
Terminal-based Chat Client for TravelMate AI Agent
Sends queries to the backend and displays responses in an interactive CLI
"""

import requests
import json
import uuid
import sys
from datetime import datetime
from typing import Optional, Dict, Any
import os
from colorama import init, Fore, Style

# Initialize colorama for Windows support
init()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
API_CHAT_ENDPOINT = f"{BACKEND_URL}/api/chat"
API_SESSION_ENDPOINT = f"{BACKEND_URL}/api/session/create"


class TerminalChat:
    """Interactive terminal chat client"""
    
    def __init__(self):
        self.user_id = str(uuid.uuid4())
        self.session_id: Optional[str] = None
        self.session = requests.Session()
        # Default location (can be changed with /location command)
        self.current_location = {
            "name": "New York City",
            "lat": 40.7128,
            "lng": -74.0060
        }
        
    def create_session(self) -> bool:
        """Create a new chat session"""
        try:
            response = self.session.post(
                API_SESSION_ENDPOINT,
                json={
                    "user_id": self.user_id,
                    "metadata": {
                        "client": "terminal-chat",
                        "version": "1.0.0"
                    }
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.session_id = data["session_id"]
                return True
            else:
                print(f"{Fore.RED}❌ Failed to create session: {response.status_code}{Style.RESET_ALL}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"{Fore.RED}❌ Connection error: {e}{Style.RESET_ALL}")
            return False
    
    def send_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> Optional[Dict]:
        """Send a message to the AI agent"""
        try:
            payload = {
                "user_id": self.user_id,
                "session_id": self.session_id,
                "message": message
            }
            
            if context:
                payload["context"] = context
            
            response = self.session.post(
                API_CHAT_ENDPOINT,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"{Fore.RED}❌ Error {response.status_code}: {response.text}{Style.RESET_ALL}")
                return None
                
        except requests.exceptions.Timeout:
            print(f"{Fore.RED}❌ Request timed out. The agent is taking too long to respond.{Style.RESET_ALL}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"{Fore.RED}❌ Connection error: {e}{Style.RESET_ALL}")
            return None
    
    def format_response(self, response: Dict) -> str:
        """Format the agent's response for terminal display"""
        output = []
        
        # Agent message
        message = response.get("message", "")
        output.append(f"{Fore.CYAN}🤖 Agent:{Style.RESET_ALL} {message}")
        
        # Map actions (if any)
        map_actions = response.get("map_actions", [])
        if map_actions:
            output.append(f"\n{Fore.YELLOW}📍 Map Actions:{Style.RESET_ALL}")
            for action in map_actions:
                action_type = action.get("type", "unknown")
                action_data = action.get("data", {})
                output.append(f"  • Type: {action_type}")
                output.append(f"    Data: {json.dumps(action_data, indent=6)}")
        
        # Metadata (if any)
        metadata = response.get("metadata")
        if metadata:
            output.append(f"\n{Fore.MAGENTA}ℹ️  Metadata:{Style.RESET_ALL}")
            output.append(f"  {json.dumps(metadata, indent=2)}")
        
        # Timestamp
        timestamp = response.get("timestamp", "")
        if timestamp:
            output.append(f"\n{Fore.WHITE}⏰ {timestamp}{Style.RESET_ALL}")
        
        return "\n".join(output)
    
    def print_header(self):
        """Print chat header"""
        print(f"\n{Fore.GREEN}{'='*70}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}🌍 TravelMate AI Agent - Terminal Chat{Style.RESET_ALL}")
        print(f"{Fore.GREEN}{'='*70}{Style.RESET_ALL}")
        print(f"{Fore.WHITE}Backend: {BACKEND_URL}{Style.RESET_ALL}")
        print(f"{Fore.WHITE}User ID: {self.user_id}{Style.RESET_ALL}")
        print(f"{Fore.WHITE}Session ID: {self.session_id}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}{'='*70}{Style.RESET_ALL}\n")
        print(f"{Fore.YELLOW}Commands:{Style.RESET_ALL}")
        print(f"  • {Fore.CYAN}/help{Style.RESET_ALL} - Show this help")
        print(f"  • {Fore.CYAN}/clear{Style.RESET_ALL} - Clear screen")
        print(f"  • {Fore.CYAN}/new{Style.RESET_ALL} - Start new session")
        print(f"  • {Fore.CYAN}/location [name] [lat] [lng]{Style.RESET_ALL} - Set your location")
        print(f"  • {Fore.CYAN}/quit or /exit{Style.RESET_ALL} - Exit chat")
        print(f"\n{Fore.MAGENTA}Current Location: {self.current_location['name']} ({self.current_location['lat']}, {self.current_location['lng']}){Style.RESET_ALL}")
        print(f"\n{Fore.WHITE}Type your message and press Enter to chat with the AI agent.{Style.RESET_ALL}\n")
    
    def run(self):
        """Run the interactive chat loop"""
        # Create session
        print(f"{Fore.YELLOW}🔄 Connecting to backend...{Style.RESET_ALL}")
        if not self.create_session():
            print(f"{Fore.RED}❌ Failed to connect to backend at {BACKEND_URL}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}💡 Make sure the backend is running with:{Style.RESET_ALL}")
            print(f"   cd backend")
            print(f"   .venv\\Scripts\\python.exe -m uvicorn main:app --reload")
            return
        
        # Print header
        self.print_header()
        
        # Main chat loop
        try:
            while True:
                # Get user input
                try:
                    user_input = input(f"{Fore.GREEN}You:{Style.RESET_ALL} ").strip()
                except EOFError:
                    break
                
                if not user_input:
                    continue
                
                # Handle commands
                if user_input.startswith('/'):
                    command = user_input.lower()
                    
                    if command in ['/quit', '/exit', '/q']:
                        print(f"\n{Fore.YELLOW}👋 Goodbye!{Style.RESET_ALL}")
                        break
                    
                    elif command == '/help':
                        self.print_header()
                        continue
                    
                    elif command == '/clear':
                        os.system('cls' if os.name == 'nt' else 'clear')
                        self.print_header()
                        continue
                    
                    elif command == '/new':
                        print(f"{Fore.YELLOW}🔄 Creating new session...{Style.RESET_ALL}")
                        if self.create_session():
                            print(f"{Fore.GREEN}✅ New session created: {self.session_id}{Style.RESET_ALL}\n")
                        continue
                    
                    elif command.startswith('/location'):
                        parts = user_input.split()
                        if len(parts) >= 4:
                            try:
                                name = ' '.join(parts[1:-2])
                                lat = float(parts[-2])
                                lng = float(parts[-1])
                                self.current_location = {
                                    "name": name,
                                    "lat": lat,
                                    "lng": lng
                                }
                                print(f"{Fore.GREEN}✅ Location set to: {name} ({lat}, {lng}){Style.RESET_ALL}\n")
                            except ValueError:
                                print(f"{Fore.RED}❌ Invalid coordinates. Usage: /location [name] [latitude] [longitude]{Style.RESET_ALL}\n")
                        else:
                            print(f"{Fore.YELLOW}Current location: {self.current_location['name']} ({self.current_location['lat']}, {self.current_location['lng']}){Style.RESET_ALL}")
                            print(f"{Fore.YELLOW}To change: /location [name] [latitude] [longitude]{Style.RESET_ALL}\n")
                        continue
                    
                    else:
                        print(f"{Fore.RED}❌ Unknown command: {user_input}{Style.RESET_ALL}")
                        print(f"{Fore.YELLOW}Type /help for available commands{Style.RESET_ALL}\n")
                        continue
                
                # Send message to agent
                print(f"{Fore.YELLOW}⏳ Thinking...{Style.RESET_ALL}", end='\r')
                
                # Include location context with every message
                context = {
                    "current_location": self.current_location
                }
                
                response = self.send_message(user_input, context=context)
                print(" " * 50, end='\r')  # Clear "Thinking..." line
                
                if response:
                    print(self.format_response(response))
                    print()  # Add blank line for readability
                
        except KeyboardInterrupt:
            print(f"\n\n{Fore.YELLOW}👋 Chat interrupted. Goodbye!{Style.RESET_ALL}")


def main():
    """Main entry point"""
    chat = TerminalChat()
    chat.run()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Smart AI Agent - Automatically switches between online and offline modes
"""

import json
import random
import time
from datetime import datetime
from groq import Groq

class SmartAIAgent:
    def __init__(self):
        self.running = True
        # Initialize Groq client
        self.groq_client = Groq(api_key="PLACE_API_KEY_HERE<")
        self.online_mode = True
        
        print("🤖 Smart AI Agent Starting...")
        print("🔄 Testing API connectivity...")
        
        # Test initial connection
        if self.test_api_connection():
            print("✅ Online mode active - Using Groq GPT-OSS-120B")
        else:
            print("🔄 Fallback to offline mode")
            self.online_mode = False
    
    def test_api_connection(self):
        """Test if API is available"""
        try:
            completion = self.groq_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": "test"}],
                max_completion_tokens=5,
                temperature=0.1
            )
            return True
        except Exception as e:
            if "rate_limit_exceeded" in str(e) or "429" in str(e):
                print("⚠️  Rate limit detected - switching to offline mode")
            return False
    
    def query_groq_safe(self, prompt):
        """Safe Groq query with fallback"""
        if not self.online_mode:
            return self.generate_offline_response(prompt)
        
        try:
            completion = self.groq_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert industrial AI assistant. Provide complete, concise responses."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_completion_tokens=1500,  # Conservative token usage
                top_p=0.9,
                stream=True,
                stop=None
            )
            
            print("🤖 GPT-OSS Response:")
            response = ""
            for chunk in completion:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    response += content
                
                if chunk.choices[0].finish_reason:
                    if chunk.choices[0].finish_reason == "length":
                        print("\\n⚠️ Response truncated - consider shorter queries")
                    break
            
            print("\\n")
            return response
            
        except Exception as e:
            if "rate_limit_exceeded" in str(e) or "429" in str(e):
                print("🚫 Rate limit hit - switching to offline mode")
                self.online_mode = False
                return self.generate_offline_response(prompt)
            else:
                print(f"❌ API Error: {e}")
                print("🔄 Switching to offline mode for this session")
                return self.generate_offline_response(prompt)
    
    def generate_factory_data(self):
        """Generate mock factory telemetry"""
        machines = ["CNC-001", "PRESS-002", "CONVEYOR-003", "PUMP-004", "MOTOR-005"]
        data = []
        
        for machine in machines:
            data.append({
                'name': machine,
                'temperature': round(70 + random.gauss(0, 15), 1),
                'vibration': round(25 + random.gauss(0, 10), 1),
                'pressure': round(8 + random.gauss(0, 2), 1),
                'status': random.choice(['normal', 'normal', 'normal', 'warning', 'critical'])
            })
        
        return data
    
    def generate_offline_response(self, prompt):
        """Generate offline responses"""
        if "factory" in prompt.lower():
            factory_data = self.generate_factory_data()
            return self.analyze_factory_offline(factory_data)
        else:
            return self.handle_general_offline(prompt)
    
    def analyze_factory_offline(self, factory_data):
        """Offline factory analysis"""
        critical_count = sum(1 for m in factory_data if m['status'] == 'critical')
        warning_count = sum(1 for m in factory_data if m['status'] == 'warning')
        
        analysis = f"""
🏭 OFFLINE FACTORY ANALYSIS
{'='*50}

📊 MACHINE STATUS:
"""
        for machine in factory_data:
            status_icon = "🟢" if machine['status'] == 'normal' else "🟡" if machine['status'] == 'warning' else "🔴"
            analysis += f"{status_icon} {machine['name']}: T={machine['temperature']}°C, V={machine['vibration']}mm/s, P={machine['pressure']}bar\\n"
        
        analysis += f"""
📈 SUMMARY:
• Critical Issues: {critical_count}
• Warning States: {warning_count}  
• Normal Operation: {5 - critical_count - warning_count}

💡 RECOMMENDATIONS:
• Monitor high-temperature machines (>85°C)
• Check vibration on machines >35mm/s
• Verify pressure systems >9 bar
• Schedule predictive maintenance

Note: This is offline analysis. For detailed AI insights, API quota needs to reset.
"""
        return analysis
    
    def handle_general_offline(self, prompt):
        """Handle general queries in offline mode"""
        keywords = {
            "predictive": "Predictive maintenance uses sensors and data analytics to predict equipment failures before they occur.",
            "iot": "IoT sensors enable real-time monitoring of industrial equipment through wireless connectivity.",
            "digital twin": "Digital twins are virtual replicas of physical systems for simulation and optimization.",
            "maintenance": "Preventive maintenance scheduling reduces unexpected downtime and extends equipment life."
        }
        
        for keyword, response in keywords.items():
            if keyword in prompt.lower():
                return f"🔄 OFFLINE RESPONSE:\\n\\n{response}\\n\\nFor detailed analysis, wait for API reset or use online mode."
        
        return """🔄 OFFLINE MODE ACTIVE

I can help with:
• Factory analysis (type 'factory')
• Basic industrial AI guidance
• Equipment monitoring concepts

For detailed AI responses, please wait for API quota reset or upgrade your plan.
"""
    
    def run_interactive(self):
        """Interactive mode with smart switching"""
        mode_indicator = "🌐 ONLINE" if self.online_mode else "💻 OFFLINE"
        print(f"\\n🗣️ INTERACTIVE MODE - {mode_indicator}")
        print("Commands: 'factory' | 'status' | 'retry' | 'exit'")
        print("💡 Mode switches automatically based on API availability\\n")
        
        while self.running:
            try:
                mode_indicator = "🌐" if self.online_mode else "💻"
                user_input = input(f"{mode_indicator} You: ").strip()
                
                if user_input.lower() in ['exit', 'quit']:
                    print("👋 Goodbye!")
                    break
                
                if user_input.lower() == 'status':
                    print("🔍 Checking API status...")
                    if self.test_api_connection():
                        self.online_mode = True
                        print("✅ API available - online mode active")
                    else:
                        self.online_mode = False
                        print("❌ API unavailable - offline mode active")
                    continue
                
                if user_input.lower() == 'retry':
                    print("🔄 Retrying API connection...")
                    if self.test_api_connection():
                        self.online_mode = True
                        print("✅ Reconnected - online mode restored")
                    else:
                        print("❌ Still unavailable - staying in offline mode")
                    continue
                
                if user_input.lower() == 'factory':
                    if self.online_mode:
                        factory_data = self.generate_factory_data()
                        prompt = f"""Analyze this factory data:

{json.dumps(factory_data, indent=2)}

Provide brief analysis covering health status, issues, and recommendations."""
                        self.query_groq_safe(prompt)
                    else:
                        response = self.generate_offline_response("factory")
                        print(response)
                else:
                    # Handle general queries
                    self.query_groq_safe(user_input)
                    
            except KeyboardInterrupt:
                print("\\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

if __name__ == "__main__":
    agent = SmartAIAgent()
    agent.run_interactive()

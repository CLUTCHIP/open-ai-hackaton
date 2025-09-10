#!/usr/bin/env python3
"""
OpenRouter AI Agent - Industrial AI Assistant
"""

import json
import random
from openai import OpenAI

class OpenRouterAgent:
    def __init__(self):
        self.running = True
        
        # OpenRouter Configuration
        self.client = OpenAI(
            api_key="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",
            base_url="https://openrouter.ai/api/v1"
        )
        
        print("🤖 OpenRouter AI Agent Starting...")
        print("🌐 Connected to OpenRouter API")
        
    def query_ai(self, prompt):
        """Query OpenRouter AI for analysis"""
        try:
            completion = self.client.chat.completions.create(
                model="openai/gpt-4o-mini",  # Fast and cost-effective
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert industrial AI assistant specializing in factory automation, predictive maintenance, and industrial IoT. Provide complete, detailed responses without cutting off mid-sentence. Always finish your thoughts completely."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2048,
                top_p=0.9,
                stream=True
            )
            
            print("🤖 AI Response:")
            response = ""
            for chunk in completion:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    response += content
                
                # Check if the response is complete
                if chunk.choices[0].finish_reason:
                    if chunk.choices[0].finish_reason == "length":
                        print("\n⚠️ Response was truncated due to length limit.")
                    elif chunk.choices[0].finish_reason == "stop":
                        print("\n✅ Response completed successfully.")
                    break
            
            print("\n")
            return response
            
        except Exception as e:
            error_msg = str(e)
            if "rate_limit" in error_msg.lower() or "429" in error_msg:
                print(f"🚫 Rate limit exceeded!")
                print("📊 You've reached your OpenRouter API limits.")
                
                print("\n💡 Options:")
                print("1. Check your OpenRouter credits at https://openrouter.ai/credits")
                print("2. Wait for rate limit reset")
                print("3. Use 'offline' mode for mock analysis")
                
                return self.generate_offline_analysis(prompt)
            else:
                print(f"❌ OpenRouter query failed: {e}")
                return None
    
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
    
    def generate_offline_analysis(self, prompt):
        """Generate offline analysis when API is unavailable"""
        print("🔄 Generating offline analysis...")
        
        if "factory" in prompt.lower() or "machines" in prompt.lower():
            return """
## OFFLINE FACTORY ANALYSIS (Mock Data)

### System Status Overview
- **Total Machines**: 5 units monitored
- **Operational**: 3 machines running normally
- **Warning Status**: 2 machines require attention
- **Critical Issues**: 0 immediate threats

### Key Findings
1. **Temperature Monitoring**: Some units showing elevated readings
2. **Vibration Analysis**: One conveyor system needs inspection
3. **Pressure Systems**: Pump unit requires calibration
4. **Overall Health**: Factory operating at 85% efficiency

### Recommended Actions
- Schedule maintenance for warning-status machines
- Implement predictive monitoring
- Review cooling systems
- Update pressure relief settings

*Note: This is an offline analysis. For detailed AI insights, please check your OpenRouter credits.*
"""
        else:
            return """
## OFFLINE RESPONSE

I'm currently operating in offline mode due to API issues.

### Available Options:
1. **Factory Analysis** - Type 'factory' for equipment status
2. **Check Credits** - Visit openrouter.ai/credits
3. **Offline Mode** - Continue with local analysis

### Basic Industrial AI Guidance:
- Focus on predictive maintenance
- Monitor key parameters (temp, vibration, pressure)
- Implement IoT sensor networks
- Use data analytics for optimization

*For detailed AI analysis, please check your OpenRouter account status.*
"""
    
    def run_interactive(self):
        """Interactive mode"""
        print("\n🗣️ INTERACTIVE MODE")
        print("Ask questions about industrial AI, factory monitoring, or anything!")
        print("Commands: 'factory' | 'status' | 'offline' | 'exit'")
        print("💡 If you hit rate limits, check your OpenRouter credits\n")
        
        while self.running:
            try:
                user_input = input("💬 You: ").strip()
                
                if user_input.lower() in ['exit', 'quit']:
                    print("👋 Goodbye!")
                    break
                
                if user_input.lower() == 'status':
                    print("🔍 API Status Check...")
                    test_response = self.query_ai("Hello")
                    if test_response:
                        print("✅ OpenRouter API is working")
                    continue
                
                if user_input.lower() == 'offline':
                    print("🔄 Switching to offline mode...")
                    response = self.generate_offline_analysis("general")
                    print(response)
                    continue
                
                if user_input.lower() == 'factory':
                    # Generate factory analysis
                    factory_data = self.generate_factory_data()
                    prompt = f"""Analyze this factory data and provide expert insights:

Factory Machines:
{json.dumps(factory_data, indent=2)}

Provide a comprehensive analysis covering:
1. Overall factory health status
2. Critical issues that need immediate attention
3. Maintenance recommendations with specific actions
4. Predictive insights for preventing future failures

Please provide a complete and detailed response, finishing all sections thoroughly."""
                    
                    self.query_ai(prompt)
                else:
                    # Direct question to AI
                    enhanced_prompt = f"{user_input}\n\nPlease provide a complete and detailed response. Ensure you finish all your thoughts and don't cut off mid-sentence."
                    self.query_ai(enhanced_prompt)
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

if __name__ == "__main__":
    agent = OpenRouterAgent()
    agent.run_interactive()

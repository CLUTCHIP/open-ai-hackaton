#!/usr/bin/env python3
"""
Standalone AI Agent for 3D Dashboard Digital Twin
Runs without Flask - pure AI agent for industrial monitoring
"""

import json
import time
from datetime import datetime
from lstm_memory_agent import LSTMMemoryAgent
import random
from groq import Groq

class StandaloneIndustrialAI:
    def __init__(self):
        self.memory_agent = LSTMMemoryAgent()
        self.running = True
        self.analysis_interval = 10  # seconds
        
        # Groq Configuration
        # Initialize Groq client
        self.groq_client = Groq(api_key="PLACE_API_KEY_HERE<")
        
        print("🤖 Standalone Industrial AI Agent Starting...")
        print("🧠 LSTM Memory Agent initialized")
        print("🔄 Continuous monitoring mode activated")
        print("☁️ Connected to Groq GPT-OSS-120B")
        
    def query_groq(self, prompt):
        """Query Groq GPT-OSS for analysis"""
        try:
            completion = self.groq_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_completion_tokens=1024,
                top_p=0.9,
                stream=False
            )
            
            return completion.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Groq query failed: {e}")
            return None
    
    def generate_mock_telemetry(self):
        """Generate mock telemetry data for demonstration"""
        machines = []
        machine_names = ["CNC-001", "PRESS-002", "CONVEYOR-003", "PUMP-004", "MOTOR-005"]
        
        for i, name in enumerate(machine_names):
            # Simulate different machine conditions
            base_temp = 70 + random.gauss(0, 5)
            base_pressure = 8 + random.gauss(0, 1)
            base_vibration = 25 + random.gauss(0, 3)
            
            # Introduce some anomalies occasionally
            if random.random() < 0.2:  # 20% chance of anomaly
                if random.random() < 0.5:
                    base_temp += random.uniform(15, 25)  # Temperature spike
                else:
                    base_vibration += random.uniform(10, 20)  # Vibration increase
            
            machine = {
                'id': f'machine_{i+1}',
                'name': name,
                'status': 'normal' if base_temp < 85 and base_vibration < 40 else 'critical',
                'telemetry': {
                    'temperature': round(base_temp, 1),
                    'pressure': round(base_pressure, 1),
                    'vibration': round(base_vibration, 1),
                    'motorSpeed': round(1800 + random.gauss(0, 50), 0),
                    'load': round(75 + random.gauss(0, 10), 1),
                    'oilLevel': round(85 + random.gauss(0, 5), 1),
                    'noiseLevel': round(65 + random.gauss(0, 5), 1)
                }
            }
            machines.append(machine)
        
        return machines
    
    def analyze_with_lstm(self, machine_data):
        """Analyze data using LSTM memory agent"""
        # Add data to memory
        self.memory_agent.add_telemetry_data(machine_data)
        
        # Get maintenance recommendations
        maintenance_recs = self.memory_agent.get_maintenance_recommendations(machine_data)
        
        # Get memory insights
        memory_insights = self.memory_agent.get_memory_insights()
        
        return {
            'maintenance_recommendations': maintenance_recs,
            'memory_insights': memory_insights,
            'analysis_timestamp': datetime.now().isoformat()
        }
    
    def analyze_with_groq(self, machine_data, lstm_analysis):
        """Analyze data using Groq GPT-OSS"""
        # Prepare context for Groq
        critical_machines = [m for m in machine_data if m['status'] == 'critical']
        high_risk_machines = [r for r in lstm_analysis['maintenance_recommendations'] 
                            if r['risk_level'] in ['high', 'critical']]
        
        prompt = f"""Industrial AI Analysis Report

Factory Status:
- Total machines: {len(machine_data)}
- Critical status: {len(critical_machines)}
- High risk machines: {len(high_risk_machines)}

Recent telemetry data:
{json.dumps([{
    'machine': m['name'], 
    'temp': m['telemetry']['temperature'],
    'vibration': m['telemetry']['vibration'],
    'pressure': m['telemetry']['pressure']
} for m in machine_data[:3]], indent=2)}

LSTM Memory Analysis:
- Data points processed: {lstm_analysis['memory_insights']['total_data_points']}
- Machines monitored: {lstm_analysis['memory_insights']['machines_monitored']}

Provide expert industrial analysis including:
1. Current operational status
2. Risk assessment
3. Immediate actions needed
4. Predictive insights

Analysis:"""

        return self.query_groq(prompt)
    
    def print_analysis_report(self, machine_data, lstm_analysis, groq_analysis):
        """Print comprehensive analysis report"""
        print("\n" + "="*80)
        print(f"🏭 INDUSTRIAL AI ANALYSIS REPORT - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        # Machine Status Overview
        print("\n📊 MACHINE STATUS OVERVIEW:")
        critical_count = len([m for m in machine_data if m['status'] == 'critical'])
        print(f"   Total Machines: {len(machine_data)}")
        print(f"   Critical Status: {critical_count}")
        print(f"   Normal Status: {len(machine_data) - critical_count}")
        
        # LSTM Memory Insights
        print("\n🧠 LSTM MEMORY ANALYSIS:")
        memory = lstm_analysis['memory_insights']
        print(f"   Data Points: {memory['total_data_points']}")
        print(f"   Machines Monitored: {memory['machines_monitored']}")
        print(f"   Models Trained: {memory['models_trained']}")
        
        # High Priority Maintenance
        high_priority = [r for r in lstm_analysis['maintenance_recommendations'] 
                        if r['risk_level'] in ['high', 'critical']]
        
        if high_priority:
            print(f"\n⚠️  HIGH PRIORITY MAINTENANCE ({len(high_priority)} machines):")
            for rec in high_priority[:3]:  # Show top 3
                print(f"   • {rec['machine_name']}: {rec['risk_level'].upper()} risk")
                for action in rec['maintenance_actions'][:2]:  # Show top 2 actions
                    print(f"     - {action['action']} ({action['priority']} priority)")
        
        # Machine Details
        print(f"\n🔧 MACHINE TELEMETRY DETAILS:")
        for machine in machine_data:
            status_icon = "🔴" if machine['status'] == 'critical' else "🟢"
            print(f"   {status_icon} {machine['name']}:")
            tel = machine['telemetry']
            print(f"      Temp: {tel['temperature']}°C | Vibration: {tel['vibration']} | Pressure: {tel['pressure']} bar")
        
        # Groq Analysis
        if groq_analysis:
            print(f"\n🤖 GROQ GPT-OSS EXPERT ANALYSIS:")
            print("   " + groq_analysis.replace('\n', '\n   '))
        else:
            print(f"\n🤖 GROQ STATUS: Analysis failed")
        
        print("\n" + "="*80)
    
    def interactive_mode(self):
        """Run interactive mode where user can ask questions"""
        print("\n🗣️  INTERACTIVE MODE ACTIVATED")
        print("Type 'exit' to quit, 'auto' for automatic monitoring, or ask questions about the factory")
        
        while self.running:
            try:
                user_input = input("\n💬 Ask me about the factory: ").strip()
                
                if user_input.lower() in ['exit', 'quit']:
                    self.running = False
                    print("👋 AI Agent shutting down...")
                    break
                
                if user_input.lower() == 'auto':
                    self.automatic_monitoring()
                    continue
                
                if user_input.lower() in ['status', 'report']:
                    # Generate current analysis
                    machine_data = self.generate_mock_telemetry()
                    lstm_analysis = self.analyze_with_lstm(machine_data)
                    groq_analysis = self.analyze_with_groq(machine_data, lstm_analysis)
                    self.print_analysis_report(machine_data, lstm_analysis, groq_analysis)
                    continue
                
                # Query Groq with user question
                machine_data = self.generate_mock_telemetry()
                context = f"Factory has {len(machine_data)} machines. Current status: {[m['name'] + ':' + m['status'] for m in machine_data]}. "
                response = self.query_groq(f"{context}User question: {user_input}")
                
                if response:
                    print(f"\n🤖 AI Response: {response}")
                else:
                    print("🚫 Failed to get response from AI model")
                    
            except KeyboardInterrupt:
                self.running = False
                print("\n👋 AI Agent shutting down...")
                break
            except Exception as e:
                print(f"Error: {e}")
    
    def automatic_monitoring(self):
        """Run automatic monitoring mode"""
        print(f"\n🔄 AUTOMATIC MONITORING MODE (every {self.analysis_interval} seconds)")
        print("Press Ctrl+C to return to interactive mode")
        
        try:
            while self.running:
                # Generate and analyze data
                machine_data = self.generate_mock_telemetry()
                lstm_analysis = self.analyze_with_lstm(machine_data)
                groq_analysis = self.analyze_with_groq(machine_data, lstm_analysis)
                
                # Print report
                self.print_analysis_report(machine_data, lstm_analysis, groq_analysis)
                
                # Wait for next analysis
                print(f"\n⏱️  Next analysis in {self.analysis_interval} seconds...")
                time.sleep(self.analysis_interval)
                
        except KeyboardInterrupt:
            print("\n🔄 Returning to interactive mode...")
    
    def run(self):
        """Main run method"""
        print("\n🚀 AI Agent ready!")
        print("Choose mode:")
        print("1. Interactive mode (ask questions)")
        print("2. Automatic monitoring")
        print("3. Single analysis report")
        
        while True:
            try:
                choice = input("\nEnter choice (1/2/3): ").strip()
                
                if choice == '1':
                    self.interactive_mode()
                    break
                elif choice == '2':
                    self.automatic_monitoring()
                    break
                elif choice == '3':
                    machine_data = self.generate_mock_telemetry()
                    lstm_analysis = self.analyze_with_lstm(machine_data)
                    groq_analysis = self.analyze_with_groq(machine_data, lstm_analysis)
                    self.print_analysis_report(machine_data, lstm_analysis, groq_analysis)
                    break
                else:
                    print("Invalid choice. Please enter 1, 2, or 3.")
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break

if __name__ == "__main__":
    # Create and run the standalone AI agent
    agent = StandaloneIndustrialAI()
    agent.run()

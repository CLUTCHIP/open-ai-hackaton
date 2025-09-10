#!/usr/bin/env python3
"""
Local AI Agent - Fallback when API quotas are exceeded
Uses local analysis and predefined responses
"""

import json
import random
import time
from datetime import datetime

class LocalAIAgent:
    def __init__(self):
        self.running = True
        
        print("🤖 Local AI Agent Starting...")
        print("💻 Running in offline mode - no API calls required")
        print("📊 Providing factory analysis using local algorithms")
        
    def analyze_factory_data_local(self, factory_data):
        """Local analysis without API calls"""
        analysis = {
            "overall_health": "Good",
            "critical_issues": [],
            "warnings": [],
            "recommendations": []
        }
        
        for machine in factory_data:
            name = machine['name']
            temp = machine['temperature']
            vib = machine['vibration']
            pressure = machine['pressure']
            status = machine['status']
            
            # Temperature analysis
            if temp > 90:
                analysis["critical_issues"].append(f"{name}: Critical temperature ({temp}°C)")
            elif temp > 80:
                analysis["warnings"].append(f"{name}: High temperature ({temp}°C)")
            
            # Vibration analysis
            if vib > 40:
                analysis["critical_issues"].append(f"{name}: Excessive vibration ({vib} mm/s)")
            elif vib > 30:
                analysis["warnings"].append(f"{name}: Elevated vibration ({vib} mm/s)")
            
            # Pressure analysis
            if pressure > 10:
                analysis["critical_issues"].append(f"{name}: Over-pressure ({pressure} bar)")
            elif pressure > 8.5:
                analysis["warnings"].append(f"{name}: High pressure ({pressure} bar)")
            
            # Status-based analysis
            if status == 'critical':
                analysis["critical_issues"].append(f"{name}: System reports critical status")
            elif status == 'warning':
                analysis["warnings"].append(f"{name}: System reports warning status")
        
        # Generate recommendations
        if analysis["critical_issues"]:
            analysis["recommendations"].extend([
                "Immediate shutdown of critical machines recommended",
                "Perform emergency maintenance on flagged equipment",
                "Check cooling systems and fluid levels"
            ])
        
        if analysis["warnings"]:
            analysis["recommendations"].extend([
                "Schedule preventive maintenance within 24-48 hours",
                "Monitor trending parameters closely",
                "Verify sensor calibration"
            ])
        
        # Overall health assessment
        if analysis["critical_issues"]:
            analysis["overall_health"] = "Critical"
        elif len(analysis["warnings"]) > 2:
            analysis["overall_health"] = "Poor"
        elif analysis["warnings"]:
            analysis["overall_health"] = "Fair"
        
        return analysis
    
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
    
    def format_analysis_report(self, analysis, factory_data):
        """Format the analysis into a readable report"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        report = f"""
╔══════════════════════════════════════════════════════════╗
║                    FACTORY ANALYSIS REPORT               ║
║                  Generated: {timestamp}                ║
╚══════════════════════════════════════════════════════════╝

📊 MACHINE STATUS OVERVIEW
{'='*60}
"""
        
        for machine in factory_data:
            status_icon = "🟢" if machine['status'] == 'normal' else "🟡" if machine['status'] == 'warning' else "🔴"
            report += f"{status_icon} {machine['name']:<12} | T:{machine['temperature']:>5.1f}°C | V:{machine['vibration']:>5.1f}mm/s | P:{machine['pressure']:>5.1f}bar\n"
        
        report += f"\n🏭 OVERALL HEALTH: {analysis['overall_health'].upper()}\n"
        
        if analysis['critical_issues']:
            report += f"\n🚨 CRITICAL ISSUES ({len(analysis['critical_issues'])})\n"
            report += "─" * 40 + "\n"
            for issue in analysis['critical_issues']:
                report += f"❌ {issue}\n"
        
        if analysis['warnings']:
            report += f"\n⚠️  WARNING CONDITIONS ({len(analysis['warnings'])})\n"
            report += "─" * 40 + "\n"
            for warning in analysis['warnings']:
                report += f"⚠️  {warning}\n"
        
        if analysis['recommendations']:
            report += f"\n💡 RECOMMENDATIONS\n"
            report += "─" * 40 + "\n"
            for i, rec in enumerate(analysis['recommendations'], 1):
                report += f"{i}. {rec}\n"
        
        report += f"\n📈 PREDICTIVE INSIGHTS\n"
        report += "─" * 40 + "\n"
        report += "• Monitor temperature trends for early warning signs\n"
        report += "• Vibration spikes may indicate bearing wear\n"
        report += "• Pressure variations suggest valve calibration needs\n"
        report += "• Implement IoT sensors for real-time monitoring\n"
        
        return report
    
    def handle_general_query(self, query):
        """Handle general industrial AI questions"""
        keywords_responses = {
            "predictive maintenance": """
🔮 PREDICTIVE MAINTENANCE OVERVIEW

Key Components:
• Sensor Integration: Temperature, vibration, pressure, current
• Data Analytics: Trend analysis and anomaly detection  
• Machine Learning: Failure prediction models
• Alert Systems: Early warning notifications

Benefits:
• Reduced unplanned downtime (up to 50%)
• Lower maintenance costs (10-40% savings)
• Extended equipment life
• Improved safety and reliability

Implementation Steps:
1. Install condition monitoring sensors
2. Establish data collection infrastructure
3. Develop baseline performance metrics
4. Train predictive models
5. Deploy alert and response systems
""",
            "iot": """
🌐 IoT IN INDUSTRIAL SETTINGS

Core Technologies:
• Wireless Sensors: LoRaWAN, WiFi, Cellular
• Edge Computing: Local data processing
• Cloud Platforms: Azure IoT, AWS IoT, Google Cloud IoT
• Communication Protocols: MQTT, OPC-UA, Modbus

Applications:
• Asset tracking and monitoring
• Environmental condition monitoring
• Energy management and optimization
• Supply chain visibility
• Quality control automation

Security Considerations:
• Network segmentation
• Encrypted communications
• Device authentication
• Regular security updates
""",
            "digital twin": """
🔄 DIGITAL TWIN TECHNOLOGY

Definition: Virtual replica of physical assets/processes

Components:
• Real-time data synchronization
• Physics-based modeling
• Simulation capabilities
• Predictive analytics
• Visualization interfaces

Use Cases:
• Process optimization
• Design validation
• Predictive maintenance
• Training simulations
• What-if scenario analysis

Technologies:
• 3D modeling and CAD integration
• Real-time data streaming
• Machine learning algorithms
• Cloud computing platforms
• AR/VR visualization
"""
        }
        
        query_lower = query.lower()
        for keyword, response in keywords_responses.items():
            if keyword in query_lower:
                return response
        
        # Default response for unmatched queries
        return """
🤖 LOCAL AI ASSISTANT

I'm running in offline mode but can help with:

📋 Available Topics:
• Factory analysis (type 'factory')
• Predictive maintenance strategies
• IoT implementation guidance  
• Digital twin concepts
• Industry 4.0 best practices
• Equipment monitoring systems

💡 Tip: Try asking about specific topics like:
- "How to implement predictive maintenance?"
- "What is a digital twin?"
- "IoT sensors for manufacturing"

For detailed analysis, consider upgrading your API plan or wait for quota reset.
"""
    
    def run_interactive(self):
        """Interactive mode"""
        print("\n🗣️ LOCAL INTERACTIVE MODE")
        print("Available commands: 'factory' | 'help' | 'exit'")
        print("Ask questions about industrial AI and manufacturing!\n")
        
        while self.running:
            try:
                user_input = input("💬 You: ").strip()
                
                if user_input.lower() in ['exit', 'quit']:
                    print("👋 Goodbye!")
                    break
                
                if user_input.lower() in ['help', '?']:
                    print(self.handle_general_query("help"))
                    continue
                
                if user_input.lower() == 'factory':
                    print("🏭 Generating factory analysis...")
                    time.sleep(1)  # Simulate processing time
                    
                    factory_data = self.generate_factory_data()
                    analysis = self.analyze_factory_data_local(factory_data)
                    report = self.format_analysis_report(analysis, factory_data)
                    print(report)
                else:
                    # Handle general queries
                    response = self.handle_general_query(user_input)
                    print(response)
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

if __name__ == "__main__":
    agent = LocalAIAgent()
    agent.run_interactive()

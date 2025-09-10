from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import json
import random
import re

app = Flask(__name__)
CORS(app)

# Initialize Groq client
groq_client = Groq(api_key="PLACE_API_KEY_HERE<")

# Global state for API availability
api_available = True
rate_limit_info = None

def test_api_availability():
    """Test if Groq API is available"""
    global api_available, rate_limit_info
    try:
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": "test"}],
            max_completion_tokens=5,
            temperature=0.1
        )
        api_available = True
        rate_limit_info = None
        return True
    except Exception as e:
        error_str = str(e)
        if "rate_limit_exceeded" in error_str or "429" in error_str:
            api_available = False
            # Extract rate limit info
            rate_limit_info = extract_rate_limit_info(error_str)
            return False
        api_available = False
        return False

def extract_rate_limit_info(error_str):
    """Extract rate limit information from error message"""
    info = {}
    
    # Extract limits and usage
    limit_match = re.search(r'Limit (\d+)', error_str)
    used_match = re.search(r'Used (\d+)', error_str)
    requested_match = re.search(r'Requested (\d+)', error_str)
    wait_match = re.search(r'Please try again in ([^.]+)', error_str)
    
    if limit_match:
        info['limit'] = int(limit_match.group(1))
    if used_match:
        info['used'] = int(used_match.group(1))
    if requested_match:
        info['requested'] = int(requested_match.group(1))
    if wait_match:
        info['wait_time'] = wait_match.group(1)
    
    return info

def generate_offline_response(query, context_type="general"):
    """Generate offline responses when API is unavailable"""
    
    if context_type == "maintenance_analysis":
        return """
🔄 **OFFLINE MAINTENANCE ANALYSIS**

⚠️ **API RATE LIMIT REACHED** - Providing basic analysis

**Immediate Actions:**
• Check all machines with temperature > 85°C
• Inspect equipment with vibration > 35 mm/s
• Verify pressure readings > 9 bar
• Review any machines with "critical" or "warning" status

**Technical Analysis:**
• High temperature indicates potential cooling system issues
• Excessive vibration suggests bearing wear or misalignment
• Pressure anomalies may indicate seal failures or blockages
• Status warnings require immediate technician inspection

**Maintenance Recommendations:**
• Schedule preventive maintenance for flagged equipment
• Perform vibration analysis on high-vibration machines
• Check coolant levels and flow rates
• Calibrate pressure sensors and relief valves

**Safety Protocols:**
• Follow LOTO procedures before maintenance
• Use appropriate PPE for all maintenance tasks
• Ensure confined space protocols if applicable
• Test electrical systems before work

**Priority Matrix:**
• Critical: Temperature > 90°C (immediate shutdown)
• High: Vibration > 40 mm/s (schedule within 24h)
• Medium: Pressure deviations (schedule within week)
• Low: Minor status warnings (next scheduled maintenance)

*Note: This is offline analysis. For detailed AI insights, please wait for API quota reset or upgrade your plan.*
"""
    
    # General query responses
    topics = {
        "predictive maintenance": "Predictive maintenance uses sensors and data analytics to predict equipment failures before they occur, reducing downtime by up to 50%.",
        "vibration analysis": "Vibration analysis detects mechanical problems like misalignment, imbalance, and bearing wear through frequency domain analysis.",
        "temperature monitoring": "Temperature monitoring helps identify overheating conditions that can lead to equipment failure and safety hazards.",
        "pressure": "Pressure monitoring is critical for hydraulic and pneumatic systems to prevent over-pressure conditions and seal failures.",
        "safety": "Industrial safety requires following LOTO procedures, using proper PPE, and adhering to OSHA regulations.",
        "maintenance": "Preventive maintenance scheduling based on manufacturer recommendations and operating conditions extends equipment life."
    }
    
    query_lower = query.lower()
    for topic, response in topics.items():
        if topic in query_lower:
            return f"🔄 **OFFLINE MODE**: {response}\n\n*For detailed AI analysis, please wait for API quota reset.*"
    
    return f"""🔄 **OFFLINE MODE ACTIVE**

I'm currently unable to access the full AI model due to rate limits, but I can help with:

• Basic maintenance guidance
• Safety protocol reminders  
• Equipment monitoring best practices
• Industrial engineering concepts

**Your Query:** {query}

**General Guidance:** Focus on safety-first approaches, follow established maintenance procedures, and consult equipment manuals for specific technical requirements.

*For detailed AI analysis, please wait for API quota reset or upgrade your plan at console.groq.com*
"""

def generate_mock_factory_analysis():
    """Generate mock factory data for offline analysis"""
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

@app.route('/api/query', methods=['POST'])
def handle_query():
    """Handle user queries with Groq - now with rate limit handling"""
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'success': False, 'error': 'Query required'}), 400
        
        # Test API availability first
        if not test_api_availability():
            # Return offline response
            offline_response = generate_offline_response(query)
            return jsonify({
                'success': True,
                'response': offline_response,
                'model_used': 'offline-mode',
                'provider': 'Local Fallback',
                'rate_limit_info': rate_limit_info,
                'offline_mode': True
            })
        
        # Query Groq with industrial engineering system prompt
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system", 
                    "content": """You are an expert Industrial Maintenance Engineer AI Assistant specialized in:

🔧 CORE EXPERTISE:
- Predictive & Preventive Maintenance
- Equipment Reliability & Asset Management  
- Root Cause Analysis & Failure Investigation
- Maintenance Planning & Scheduling
- Industrial Safety Protocols & OSHA Compliance
- Mechanical, Electrical, Hydraulic & Pneumatic Systems
- Vibration Analysis, Thermography & NDT Inspection
- Lubrication Management & Tribology
- Spare Parts Management & Inventory Control

⚠️ SAFETY PROTOCOLS:
- Always prioritize LOTO (Lockout/Tagout) procedures
- Emphasize PPE requirements for each task
- Include confined space, hot work, and electrical safety considerations
- Reference relevant safety standards (OSHA, NFPA, IEEE, etc.)

📊 RESPONSE FORMAT:
1. Immediate Safety Considerations
2. Technical Analysis & Root Cause
3. Step-by-Step Maintenance Procedures
4. Required Tools & Parts
5. Safety Precautions & PPE
6. Quality Control & Testing
7. Documentation & Reporting

Provide technical, actionable guidance that maintenance technicians can follow safely and effectively."""
                },
                {"role": "user", "content": query}
            ],
            temperature=0.3,
            max_completion_tokens=1024  # Conservative to preserve quota
        )
        
        response = completion.choices[0].message.content
        
        return jsonify({
            'success': True,
            'response': response,
            'model_used': 'openai/gpt-oss-120b',
            'provider': 'Groq Cloud',
            'offline_mode': False
        })
    
    except Exception as e:
        error_str = str(e)
        
        # Handle rate limits specifically
        if "rate_limit_exceeded" in error_str or "429" in error_str:
            rate_info = extract_rate_limit_info(error_str)
            offline_response = generate_offline_response(query)
            
            return jsonify({
                'success': True,  # Still successful, just offline
                'response': offline_response,
                'model_used': 'offline-mode',
                'provider': 'Local Fallback',
                'rate_limit_info': rate_info,
                'offline_mode': True
            })
        
        # Other errors
        return jsonify({
            'success': False, 
            'error': f"AI Service Error: {str(e)}",
            'offline_mode': False
        }), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_telemetry():
    """Analyze machine telemetry data for maintenance insights - with rate limit handling"""
    try:
        data = request.json
        machine_data = data.get('machines', [])
        
        if not machine_data:
            return jsonify({'success': False, 'error': 'Machine data required'}), 400
        
        # Test API availability first
        if not test_api_availability():
            # Return offline analysis
            offline_analysis = generate_offline_response("", "maintenance_analysis")
            return jsonify({
                'success': True,
                'analysis': {
                    'maintenance_insights': offline_analysis,
                    'machines_analyzed': len(machine_data),
                    'analysis_type': 'Offline Maintenance Analysis'
                },
                'model_used': 'offline-mode',
                'provider': 'Local Fallback',
                'rate_limit_info': rate_limit_info,
                'offline_mode': True
            })
        
        # Create maintenance analysis prompt
        analysis_prompt = f"""MAINTENANCE ANALYSIS REQUEST

Machine Telemetry Data:
{str(machine_data)[:2000]}  # Limit data size

As an Industrial Maintenance Engineer, provide:

🚨 IMMEDIATE ACTIONS:
- Any critical safety concerns requiring immediate shutdown
- Emergency procedures if equipment poses hazards

🔍 TECHNICAL ANALYSIS:
- Vibration analysis (bearing condition, alignment, balance)
- Temperature analysis (overheating, thermal patterns)
- Pressure analysis (leaks, blockages, pump performance)
- Overall equipment effectiveness assessment

📋 MAINTENANCE RECOMMENDATIONS:
- Preventive maintenance schedule adjustments
- Predictive maintenance strategies
- Parts that may need replacement soon
- Lubrication requirements

⚠️ SAFETY PROTOCOLS:
- Required PPE for maintenance tasks
- LOTO procedures needed
- Confined space or electrical safety considerations

📊 PRIORITY MATRIX:
- Critical (immediate action required)
- High (schedule within 1 week)
- Medium (schedule within 1 month)
- Low (monitor during next scheduled maintenance)

Provide actionable insights for the maintenance department."""

        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Industrial Maintenance Engineer AI providing technical analysis and safety-focused recommendations."
                },
                {"role": "user", "content": analysis_prompt}
            ],
            temperature=0.2,  # Lower temperature for more consistent technical analysis
            max_completion_tokens=1200  # Conservative
        )
        
        analysis = completion.choices[0].message.content
        
        return jsonify({
            'success': True,
            'analysis': {
                'maintenance_insights': analysis,
                'machines_analyzed': len(machine_data),
                'analysis_type': 'Industrial Maintenance Engineering'
            },
            'model_used': 'openai/gpt-oss-120b',
            'provider': 'Groq Cloud',
            'offline_mode': False
        })
    
    except Exception as e:
        error_str = str(e)
        
        # Handle rate limits
        if "rate_limit_exceeded" in error_str or "429" in error_str:
            rate_info = extract_rate_limit_info(error_str)
            offline_analysis = generate_offline_response("", "maintenance_analysis")
            
            return jsonify({
                'success': True,
                'analysis': {
                    'maintenance_insights': offline_analysis,
                    'machines_analyzed': len(machine_data),
                    'analysis_type': 'Offline Maintenance Analysis'
                },
                'model_used': 'offline-mode',
                'provider': 'Local Fallback',
                'rate_limit_info': rate_info,
                'offline_mode': True
            })
        
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check - backend is always healthy, API availability is separate"""
    # Test API availability
    api_working = test_api_availability()
    
    return jsonify({
        'status': 'healthy',
        'gpt_oss_available': True,  # Backend server is always available
        'api_working': api_working,  # Separate field for API status
        'model_name': 'openai/gpt-oss-120b',
        'provider': 'Groq Cloud',
        'rate_limit_info': rate_limit_info if not api_working else None,
        'offline_mode': not api_working
    })

@app.route('/api/model-status', methods=['GET'])
def model_status():
    """Model status - backend is available, API status is separate"""
    api_working = test_api_availability()
    
    return jsonify({
        'success': True,
        'gpt_oss_available': True,  # Backend server is always available
        'api_working': api_working,  # Separate field for API status
        'current_model': 'openai/gpt-oss-120b' if api_working else 'offline-mode',
        'provider': 'Groq Cloud' if api_working else 'Local Fallback',
        'rate_limit_info': rate_limit_info if not api_working else None,
        'offline_mode': not api_working
    })

@app.route('/api/retry-connection', methods=['POST'])
def retry_connection():
    """Endpoint to retry API connection"""
    api_working = test_api_availability()
    
    return jsonify({
        'success': True,
        'api_available': api_working,
        'message': 'API connection restored' if api_working else 'API still unavailable',
        'rate_limit_info': rate_limit_info if not api_working else None
    })

if __name__ == '__main__':
    print("🚀 Groq Flask Backend starting on http://localhost:5000")
    print("🔧 CORS enabled for frontend communication")
    print("📡 Health endpoint: http://localhost:5000/api/health")
    try:
        app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=False)
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        print("💡 Trying alternative port...")
        try:
            app.run(host='127.0.0.1', port=5001, debug=True, use_reloader=False)
        except Exception as e2:
            print(f"❌ Alternative port also failed: {e2}")

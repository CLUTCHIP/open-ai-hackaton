from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import ollama
import json
import random
import re

app = Flask(__name__)
CORS(app)

# Initialize OpenRouter client with extended timeout
openrouter_client = OpenAI(
    api_key="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",
    base_url="https://openrouter.ai/api/v1",
    timeout=120.0  # 2 minutes timeout
)

# Global state
current_mode = "online"  # "online" or "offline"
api_available = True
rate_limit_info = None

def test_openrouter_availability():
    """Test if OpenRouter API is available"""
    global api_available, rate_limit_info
    try:
        completion = openrouter_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5,
            temperature=0.1
        )
        api_available = True
        rate_limit_info = None
        return True
    except Exception as e:
        error_str = str(e)
        if "rate_limit" in error_str.lower() or "429" in error_str:
            api_available = False
            rate_limit_info = extract_rate_limit_info(error_str)
            return False
        api_available = False
        return False

def test_ollama_availability():
    """Test if Ollama is available with optimized settings"""
    try:
        # Set environment variables for memory optimization BEFORE any Ollama operations
        import os
        os.environ['OLLAMA_NUM_PARALLEL'] = '1'
        os.environ['OLLAMA_MAX_LOADED_MODELS'] = '1'
        os.environ['OLLAMA_GPU_LAYERS'] = '0'
        os.environ['OLLAMA_LLM_LIBRARY'] = 'cpu'  # Force CPU mode
        os.environ['OLLAMA_LOW_VRAM'] = 'true'   # Enable low VRAM mode
        
        # Test Ollama connection
        models = ollama.list()
        # Check if gpt-oss:20b is available - using correct attribute name
        available_models = [model.model for model in models.models]
        return 'gpt-oss:20b' in available_models
    except Exception as e:
        print(f"Ollama test failed: {e}")
        return False

def query_ollama(prompt, system_prompt):
    """Query local Ollama model with optimized settings"""
    try:
        # Set environment variables for memory optimization BEFORE any Ollama operations
        import os
        os.environ['OLLAMA_NUM_PARALLEL'] = '1'
        os.environ['OLLAMA_MAX_LOADED_MODELS'] = '1' 
        os.environ['OLLAMA_GPU_LAYERS'] = '0'  # CPU-only for memory conservation
        os.environ['OLLAMA_LLM_LIBRARY'] = 'cpu'  # Force CPU mode
        os.environ['OLLAMA_LOW_VRAM'] = 'true'   # Enable low VRAM mode
        
        # Use a smaller context and optimize for low memory with extended timeout
        import ollama
        # Set longer timeout for large model processing
        client = ollama.Client(timeout=600)  # 10 minutes timeout
        
        response = client.chat(
            model='gpt-oss:20b',
            messages=[
                {
                    'role': 'system',
                    'content': system_prompt[:1000]  # Truncate system prompt for memory
                },
                {
                    'role': 'user', 
                    'content': prompt[:500]  # Truncate user prompt for memory
                }
            ],
            options={
                'temperature': 0.3,
                'top_p': 0.9,
                'num_predict': 256,      # Even smaller output for memory
                'num_ctx': 1024,         # Much smaller context window (was 2048)
                'low_vram': True,        # Enable low VRAM mode
                'f16_kv': False,         # Use f32 for key-value cache (more memory efficient)
                'use_mmap': True,        # Use memory mapping
                'use_mlock': False,      # Don't lock memory pages
                'numa': False            # Disable NUMA optimizations
            }
        )
        return response['message']['content']
    except Exception as e:
        print(f"Ollama query failed: {e}")
        return None

def extract_rate_limit_info(error_str):
    """Extract rate limit information from error message"""
    info = {}
    wait_match = re.search(r'Please try again in ([^.]+)', error_str)
    if wait_match:
        info['wait_time'] = wait_match.group(1)
    return info

def generate_offline_response(query, context_type="general"):
    """Generate basic offline responses when both APIs fail"""
    
    if context_type == "maintenance_analysis":
        return """
🔄 **OFFLINE MAINTENANCE ANALYSIS**

⚠️ **API UNAVAILABLE** - Providing basic analysis

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

*Note: This is basic offline analysis. Switch to Ollama mode for AI-powered insights.*
"""
    
    return f"""🔄 **BASIC OFFLINE MODE**

Current query: {query}

For AI-powered responses, try:
• Switch to Ollama mode (offline AI)
• Check your OpenRouter connection
• Ensure Ollama is running locally

*Basic guidance available, but AI analysis requires either online or Ollama mode.*
"""

@app.route('/api/toggle-mode', methods=['POST'])
def toggle_mode():
    """Toggle between online (OpenRouter) and offline (Ollama) modes"""
    global current_mode
    
    data = request.json
    new_mode = data.get('mode', 'online')  # 'online' or 'offline'
    
    if new_mode == 'offline':
        # Test if Ollama is available
        if test_ollama_availability():
            current_mode = 'offline'
            return jsonify({
                'success': True,
                'mode': 'offline',
                'provider': 'Ollama Local',
                'model': 'gpt-oss:20b',
                'message': 'Switched to offline mode with Ollama'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Ollama not available. Please ensure Ollama is running and gpt-oss:20b model is installed.',
                'mode': current_mode
            }), 400
    
    elif new_mode == 'online':
        current_mode = 'online'
        api_working = test_openrouter_availability()
        return jsonify({
            'success': True,
            'mode': 'online',
            'provider': 'OpenRouter',
            'model': 'openai/gpt-oss-120b',
            'api_working': api_working,
            'message': 'Switched to online mode with OpenRouter'
        })
    
    else:
        return jsonify({'success': False, 'error': 'Invalid mode. Use "online" or "offline"'}), 400

@app.route('/api/query', methods=['POST'])
def handle_query():
    """Handle user queries with current mode (OpenRouter or Ollama)"""
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'success': False, 'error': 'Query required'}), 400
        
        # Industrial AI system prompt
        system_prompt = """You are an expert Industrial Maintenance Engineer AI Assistant specialized in:

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

        if current_mode == 'offline':
            # Use Ollama for offline processing
            if not test_ollama_availability():
                return jsonify({
                    'success': False,
                    'error': 'Ollama not available. Please ensure Ollama is running and gpt-oss:20b model is installed.',
                    'mode': current_mode
                }), 500
            
            response = query_ollama(query, system_prompt)
            if response:
                return jsonify({
                    'success': True,
                    'response': response,
                    'model_used': 'gpt-oss:20b',
                    'provider': 'Ollama Local',
                    'mode': 'offline',
                    'offline_mode': True
                })
            else:
                # In offline mode, if Ollama fails, provide a clear offline error message
                offline_response = f"""🔄 **OLLAMA OFFLINE MODE - QUERY FAILED**

❌ **Local AI Model Unavailable**

The local Ollama model (gpt-oss:20b) encountered an error or is not responding properly.

**Troubleshooting Steps:**
1. Check if Ollama service is running: `ollama serve`
2. Verify the model is installed: `ollama list`
3. Try pulling the model: `ollama pull gpt-oss:20b`
4. Restart Ollama service if needed

**Your Query:** {query}

*Note: This is offline mode - no external APIs are being used.*
"""
                return jsonify({
                    'success': True,
                    'response': offline_response,
                    'model_used': 'offline-fallback',
                    'provider': 'Local Fallback',
                    'mode': 'offline',
                    'offline_mode': True,
                    'error_info': 'Ollama query failed'
                })
        
        else:  # online mode
            # Test OpenRouter API availability first
            if not test_openrouter_availability():
                # Return offline response
                offline_response = generate_offline_response(query)
                return jsonify({
                    'success': True,
                    'response': offline_response,
                    'model_used': 'basic-offline',
                    'provider': 'Local Fallback',
                    'rate_limit_info': rate_limit_info,
                    'mode': 'online',
                    'offline_mode': True
                })
            
            # Query OpenRouter
            completion = openrouter_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                temperature=0.3,
                max_tokens=1024
            )
            
            response = completion.choices[0].message.content
            
            return jsonify({
                'success': True,
                'response': response,
                'model_used': 'openai/gpt-oss-120b',
                'provider': 'OpenRouter',
                'mode': 'online',
                'offline_mode': False
            })
    
    except Exception as e:
        error_str = str(e)
        
        # Handle rate limits specifically for online mode
        if current_mode == 'online' and ("rate_limit" in error_str.lower() or "429" in error_str):
            rate_info = extract_rate_limit_info(error_str)
            offline_response = generate_offline_response(query)
            
            return jsonify({
                'success': True,
                'response': offline_response,
                'model_used': 'basic-offline',
                'provider': 'Local Fallback',
                'rate_limit_info': rate_info,
                'mode': current_mode,
                'offline_mode': True
            })
        
        return jsonify({
            'success': False, 
            'error': f"AI Service Error: {str(e)}",
            'mode': current_mode
        }), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_telemetry():
    """Analyze machine telemetry data for maintenance insights"""
    try:
        data = request.json
        machine_data = data.get('machines', [])
        
        if not machine_data:
            return jsonify({'success': False, 'error': 'Machine data required'}), 400
        
        # Create maintenance analysis prompt
        analysis_prompt = f"""MAINTENANCE ANALYSIS REQUEST

Machine Telemetry Data:
{str(machine_data)[:2000]}

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

        system_prompt = "You are an expert Industrial Maintenance Engineer AI providing technical analysis and safety-focused recommendations."

        if current_mode == 'offline':
            # Use Ollama
            if not test_ollama_availability():
                offline_analysis = generate_offline_response("", "maintenance_analysis")
                return jsonify({
                    'success': True,
                    'analysis': {
                        'maintenance_insights': offline_analysis,
                        'machines_analyzed': len(machine_data),
                        'analysis_type': 'Basic Offline Analysis'
                    },
                    'model_used': 'basic-offline',
                    'provider': 'Local Fallback',
                    'mode': 'offline'
                })
            
            analysis = query_ollama(analysis_prompt, system_prompt)
            if analysis:
                return jsonify({
                    'success': True,
                    'analysis': {
                        'maintenance_insights': analysis,
                        'machines_analyzed': len(machine_data),
                        'analysis_type': 'Ollama AI Analysis'
                    },
                    'model_used': 'gpt-oss:20b',
                    'provider': 'Ollama Local',
                    'mode': 'offline'
                })
        
        else:  # online mode
            if not test_openrouter_availability():
                offline_analysis = generate_offline_response("", "maintenance_analysis")
                return jsonify({
                    'success': True,
                    'analysis': {
                        'maintenance_insights': offline_analysis,
                        'machines_analyzed': len(machine_data),
                        'analysis_type': 'Basic Offline Analysis'
                    },
                    'model_used': 'basic-offline',
                    'provider': 'Local Fallback',
                    'mode': 'online',
                    'offline_mode': True
                })
            
            completion = openrouter_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.2,
                max_tokens=1200
            )
            
            analysis = completion.choices[0].message.content
            
            return jsonify({
                'success': True,
                'analysis': {
                    'maintenance_insights': analysis,
                    'machines_analyzed': len(machine_data),
                    'analysis_type': 'OpenRouter AI Analysis'
                },
                'model_used': 'openai/gpt-oss-120b',
                'provider': 'OpenRouter',
                'mode': 'online'
            })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    openrouter_working = test_openrouter_availability() if current_mode == 'online' else False
    ollama_working = test_ollama_availability() if current_mode == 'offline' else False
    
    return jsonify({
        'status': 'healthy',
        'mode': current_mode,
        'openrouter_available': openrouter_working,
        'ollama_available': test_ollama_availability(),
        'api_working': openrouter_working if current_mode == 'online' else ollama_working,
        'current_provider': 'OpenRouter' if current_mode == 'online' else 'Ollama Local',
        'current_model': 'openai/gpt-oss-120b' if current_mode == 'online' else 'gpt-oss:20b',
        'rate_limit_info': rate_limit_info if not openrouter_working else None
    })

@app.route('/api/model-status', methods=['GET'])
def model_status():
    """Model status endpoint"""
    openrouter_working = test_openrouter_availability() if current_mode == 'online' else False
    ollama_working = test_ollama_availability()
    
    return jsonify({
        'success': True,
        'mode': current_mode,
        'openrouter_available': openrouter_working,
        'ollama_available': ollama_working,
        'api_working': openrouter_working if current_mode == 'online' else ollama_working,
        'current_model': 'openai/gpt-oss-120b' if current_mode == 'online' else 'gpt-oss:20b',
        'provider': 'OpenRouter' if current_mode == 'online' else 'Ollama Local',
        'rate_limit_info': rate_limit_info if not openrouter_working else None
    })

@app.route('/api/retry-connection', methods=['POST'])
def retry_connection():
    """Endpoint to retry API connection"""
    if current_mode == 'online':
        api_working = test_openrouter_availability()
        return jsonify({
            'success': True,
            'api_available': api_working,
            'message': 'OpenRouter connection restored' if api_working else 'OpenRouter still unavailable',
            'rate_limit_info': rate_limit_info if not api_working else None
        })
    else:
        api_working = test_ollama_availability()
        return jsonify({
            'success': True,
            'api_available': api_working,
            'message': 'Ollama connection restored' if api_working else 'Ollama still unavailable'
        })

if __name__ == '__main__':
    print("🚀 Hybrid AI Backend starting on http://localhost:5000")
    print("🔧 CORS enabled for frontend communication")
    print("🌐 Online Mode: OpenRouter API with gpt-oss-120b")
    print("💻 Offline Mode: Ollama Local with gpt-oss:20b")
    print("📡 Health endpoint: http://localhost:5000/api/health")
    print("🔄 Toggle endpoint: http://localhost:5000/api/toggle-mode")
    
    try:
        app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=False)
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        print("💡 Trying alternative port...")
        try:
            app.run(host='127.0.0.1', port=5001, debug=True, use_reloader=False)
        except Exception as e2:
            print(f"❌ Alternative port also failed: {e2}")

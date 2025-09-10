#!/usr/bin/env python3
"""
API Status Checker - Check Groq API quota and rate limits
"""

from groq import Groq
import json

def check_api_status():
    """Check Groq API status and quota"""
    try:
        # Initialize client
        client = Groq(api_key="PLACE_API_KEY_HERE<")
        
        print("🔍 Checking Groq API Status...")
        
        # Try a minimal request to test connectivity
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": "Hi"}],
            max_completion_tokens=5,
            temperature=0.1
        )
        
        print("✅ API Connection: Working")
        print("📋 Model: openai/gpt-oss-120b")
        print("🔗 Status: Active")
        
        if completion.choices[0].message.content:
            print("💬 Test Response: Received")
        
        # Try to get usage info (if available in response headers)
        print("\n📊 Usage Information:")
        print("Note: Detailed usage may require checking Groq console")
        print("🌐 Console: https://console.groq.com/settings/billing")
        
        return True
        
    except Exception as e:
        error_str = str(e)
        print("❌ API Status: Error")
        
        if "rate_limit_exceeded" in error_str or "429" in error_str:
            print("🚫 Issue: Rate limit exceeded")
            
            # Extract details from error message
            if "Limit" in error_str and "Used" in error_str:
                import re
                limit_match = re.search(r'Limit (\d+)', error_str)
                used_match = re.search(r'Used (\d+)', error_str)
                
                if limit_match and used_match:
                    limit = limit_match.group(1)
                    used = used_match.group(1)
                    print(f"📈 Daily Limit: {limit} tokens")
                    print(f"📊 Used Today: {used} tokens")
                    print(f"📉 Remaining: {int(limit) - int(used)} tokens")
            
            # Extract wait time
            if "Please try again in" in error_str:
                wait_match = re.search(r'Please try again in ([^.]+)', error_str)
                if wait_match:
                    wait_time = wait_match.group(1)
                    print(f"⏱️  Wait Time: {wait_time}")
            
            print("\n💡 Solutions:")
            print("1. Wait for rate limit reset (resets daily)")
            print("2. Upgrade to Dev Tier for higher limits")
            print("3. Use local_agent.py for offline analysis")
            
        else:
            print(f"❌ Error Details: {error_str}")
        
        return False

def main():
    print("╔══════════════════════════════════════╗")
    print("║         GROQ API STATUS CHECKER      ║")
    print("╚══════════════════════════════════════╝\n")
    
    status = check_api_status()
    
    print("\n" + "="*50)
    if status:
        print("🎉 Ready to use simple_groq_agent.py")
    else:
        print("🔄 Recommend using local_agent.py instead")
    print("="*50)

if __name__ == "__main__":
    main()

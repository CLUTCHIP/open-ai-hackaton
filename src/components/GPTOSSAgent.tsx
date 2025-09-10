import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Brain, MessageCircle, CheckCircle, XCircle, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';

interface AIAgentProps {
  machines: any[];
  ref?: React.Ref<any>;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelUsed?: string;
}

const AIAgent: React.FC<AIAgentProps> = ({ machines, isFullscreen = false, onToggleFullscreen }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking' | 'offline'>('checking');
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  const [currentMode, setCurrentMode] = useState<'online' | 'offline'>('online');
  const [isToggling, setIsToggling] = useState(false);
  const [internalFullscreen, setInternalFullscreen] = useState(false);

  // Use internal fullscreen state if no external control is provided
  const fullscreenMode = isFullscreen || internalFullscreen;
  const toggleFullscreen = onToggleFullscreen || (() => setInternalFullscreen(!internalFullscreen));

  // Check backend connection and model status
  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle keyboard shortcuts for fullscreen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F11' || (e.key === 'f' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'Escape' && fullscreenMode) {
        toggleFullscreen();
      }
    };

    if (fullscreenMode) {
      document.addEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [fullscreenMode, toggleFullscreen]);

  const checkBackendConnection = async () => {
    try {
      setBackendStatus('checking');
      console.log('Checking backend connection...');
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      // Check health with timeout
      const healthResponse = await fetch('http://localhost:5000/api/health', {
        signal: controller.signal
      });
      console.log('Health response status:', healthResponse.status);
      const healthData = await healthResponse.json();
      console.log('Health data:', healthData);
      
      // Check model status
      const modelResponse = await fetch('http://localhost:5000/api/model-status', {
        signal: controller.signal
      });
      console.log('Model response status:', modelResponse.status);
      const modelData = await modelResponse.json();
      console.log('Model data:', modelData);
      
      clearTimeout(timeoutId); // Clear timeout if requests complete
      setModelStatus(modelData);
      setRateLimitInfo(healthData.rate_limit_info);
      setCurrentMode(healthData.mode || 'online');
      
      // Backend is always considered connected if we get a response
      // API availability is separate from backend availability
      if (healthData.offline_mode || !healthData.api_working) {
        setBackendStatus('offline');
      } else {
        setBackendStatus('connected');
      }
      
    } catch (error) {
      console.error('Backend connection check failed:', error);
      // Only set to disconnected if we can't reach the backend server at all
      setBackendStatus('disconnected');
      setModelStatus(null);
      setRateLimitInfo(null);
    }
  };

  const toggleMode = async () => {
    setIsToggling(true);
    try {
      const newMode = currentMode === 'online' ? 'offline' : 'online';
      
      const response = await fetch('http://localhost:5000/api/toggle-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: newMode })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentMode(newMode);
        // Add a system message to show the mode change
        const systemMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🔄 Switched to ${newMode === 'online' ? 'Online' : 'Offline'} mode using ${data.provider} (${data.model})`,
          timestamp: new Date(),
          modelUsed: data.provider
        };
        setMessages(prev => [...prev, systemMessage]);
        
        // Refresh backend status
        await checkBackendConnection();
      } else {
        // Show error message
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ Failed to switch modes: ${data.error}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Mode toggle failed:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Failed to toggle mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsToggling(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Create an AbortController for timeout handling - GPU accelerated
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), currentMode === 'offline' ? 120000 : 20000); // 2 minutes for Ollama, 20 seconds for OpenRouter

      const response = await fetch('http://localhost:5000/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          machines: machines
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId); // Clear timeout if request completes
      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          modelUsed: data.model_used || data.provider
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Update status based on response
        if (data.offline_mode) {
          setBackendStatus('offline');
          setRateLimitInfo(data.rate_limit_info);
        } else {
          setBackendStatus('connected');
          setRateLimitInfo(null);
        }
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      let errorContent = 'Failed to connect to AI backend. Please ensure the server is running.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          if (currentMode === 'offline') {
            errorContent = 'Ollama local model is taking too long to respond. The model may be loading or processing. Please try again or check if Ollama is running properly.';
          } else {
            errorContent = 'OpenRouter model is taking too long to respond. Try a simpler query or check if the model is overloaded.';
          }
        } else if (error.message.includes('fetch')) {
          errorContent = 'Connection failed. Please ensure the backend server is running on port 5000.';
        }
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errorContent}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'offline': return 'text-orange-600';
      case 'disconnected': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'offline': return <AlertTriangle className="w-4 h-4" />;
      case 'disconnected': return <XCircle className="w-4 h-4" />;
      case 'checking': return <Loader2 className="w-4 h-4 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Available';
      case 'offline': return 'Offline Mode';
      case 'disconnected': return 'Unavailable';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  const retryConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/retry-connection', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.api_available) {
        setBackendStatus('connected');
        setRateLimitInfo(null);
      } else {
        setBackendStatus('offline');
        setRateLimitInfo(data.rate_limit_info);
      }
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  return (
    <div className={`${fullscreenMode ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}>
      <Card className={`${fullscreenMode ? 'h-full rounded-lg border shadow-lg' : 'h-full'} flex flex-col`}>
        <CardHeader className={`${fullscreenMode ? 'pb-4 px-6 pt-6' : 'pb-4'}`}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Hybrid AI Agent
              {fullscreenMode && <Badge variant="secondary" className="ml-2">Fullscreen</Badge>}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Fullscreen Toggle Button */}
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                title={fullscreenMode ? "Exit Fullscreen (ESC)" : "Enter Fullscreen (F11)"}
              >
                {fullscreenMode ? (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    Fullscreen
                  </>
                )}
              </Button>
              
              {/* Mode Toggle Button */}
              <Button
                onClick={toggleMode}
                disabled={isToggling}
                variant={currentMode === 'online' ? 'default' : 'secondary'}
                size="sm"
                className="flex items-center gap-2"
              >
                {isToggling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {currentMode === 'online' ? '🌐' : '💻'}
                    {currentMode === 'online' ? 'Online' : 'Offline'}
                  </>
                )}
              </Button>
            </div>
          </div>
        
        {/* Status Display */}
        <div className="flex items-center gap-4 text-sm">
          <div className={`flex items-center gap-2 ${getStatusColor(backendStatus)}`}>
            {getStatusIcon(backendStatus)}
            <span>
              {currentMode === 'online' ? 'OpenRouter' : 'Ollama Local'}: {getStatusText(backendStatus)}
            </span>
          </div>
          
          {modelStatus?.current_model && (
            <Badge variant="secondary" className="text-xs">
              {modelStatus.current_model}
            </Badge>
          )}
          
          {modelStatus?.provider && (
            <Badge variant="outline" className="text-xs">
              {modelStatus.provider}
            </Badge>
          )}
          
          {backendStatus === 'offline' && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={retryConnection}
              className="text-xs h-6"
            >
              Retry
            </Button>
          )}
        </div>

        {/* Rate Limit Info */}
        {rateLimitInfo && (
          <Alert className="mt-2">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="text-sm">
                <strong>API Rate Limit Reached</strong>
                <div className="mt-1">
                  Used: {rateLimitInfo.used?.toLocaleString()} / {rateLimitInfo.limit?.toLocaleString()} tokens
                  {rateLimitInfo.wait_time && (
                    <div>Reset in: {rateLimitInfo.wait_time}</div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Currently using offline mode with basic analysis. 
                  <a href="https://openrouter.ai/credits" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                    Check credits
                  </a> for continued access.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Status Alert */}
        {backendStatus === 'disconnected' && (
          <Alert className="mt-2">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Backend server is not available. Please ensure the server is running on port 5000.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className={`${fullscreenMode ? 'flex-1 flex flex-col px-6 pb-6' : 'flex-1 flex flex-col'}`}>
        {/* Chat Messages */}
        <div className={`flex-1 overflow-y-auto space-y-4 mb-4 min-h-0 ${fullscreenMode ? 'max-h-[calc(100vh-280px)]' : ''}`}>
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with your {currentMode === 'offline' ? 'Ollama Local' : 'OpenRouter'} Industrial AI Agent</p>
              <p className="text-sm mt-2">Ask about machine analysis, predictive maintenance, or manufacturing insights</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.modelUsed && (
                      <Badge variant="outline" className="text-xs">
                        {message.modelUsed}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {currentMode === 'offline' ? 'Ollama Local processing...' : 'OpenRouter processing...'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              backendStatus === 'connected' 
                ? currentMode === 'offline' 
                  ? "Ask your Ollama local agent about manufacturing insights..."
                  : "Ask your OpenRouter agent about manufacturing insights..."
                : backendStatus === 'offline'
                ? currentMode === 'offline'
                  ? "Ollama offline mode - AI analysis available..."
                  : "OpenRouter offline mode - basic analysis available..."
                : currentMode === 'offline'
                  ? "Ollama model not available..."
                  : "OpenRouter model not available..."
            }
            disabled={isLoading || backendStatus === 'disconnected'}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || backendStatus === 'disconnected'}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Model Info */}
        {modelStatus?.gpt_oss_available && !rateLimitInfo && (
          <div className="mt-2 text-xs text-gray-500">
            Powered by {modelStatus.current_model} via {modelStatus.provider}
          </div>
        )}
        
        {backendStatus === 'offline' && (
          <div className="mt-2 text-xs text-orange-600">
            ⚠️ Offline mode active - providing basic analysis without full AI capabilities
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};

export default AIAgent;

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, Send, Bot, Loader2, Key, Search, Brain, Database, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/components/ui/use-toast";

interface Alert {
  id: string;
  machine: string;
  message: string;
  severity: 'critical' | 'warning' | 'normal';
  timestamp: string;
}

interface AIAgentProps {
  alerts: Alert[];
  machines?: any[]; // Add machines data for LSTM analysis
}

interface Analysis {
  id: string;
  alert: Alert;
  solution: string;
  timestamp: string;
  isLoading?: boolean;
  memoryInsights?: any;
  predictiveAnalysis?: any[];
  riskLevel?: string;
}

interface MemoryStatus {
  total_data_points: number;
  parameters_tracked: number;
  machines_monitored: number;
  models_trained: number;
  memory_utilization: any;
}

export const AIAgent = ({ alerts, machines = [] }: AIAgentProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState("");
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedApiKey = localStorage.getItem('groq-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    
    // Check backend connection
    checkBackendConnection();
    
    // Fetch memory status
    fetchMemoryStatus();
    
    // Auto-analyze machines with LSTM when machines data changes
    if (machines.length > 0 && backendConnected) {
      autoAnalyzeMachines();
    }
  }, [machines, backendConnected]);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        const data = await response.json();
        setBackendConnected(true);
        setIsOfflineMode(!data.gpt_oss_available);
      } else {
        setBackendConnected(false);
      }
    } catch (error) {
      setBackendConnected(false);
      console.log('Backend not available, falling back to Groq API');
    }
  };

  const fetchMemoryStatus = async () => {
    if (!backendConnected) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/memory-status');
      if (response.ok) {
        const data = await response.json();
        setMemoryStatus(data.memory_status);
      }
    } catch (error) {
      console.error('Failed to fetch memory status:', error);
    }
  };

  const autoAnalyzeMachines = async () => {
    if (!backendConnected || machines.length === 0) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          machines: machines,
          query: null
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update memory status
          if (data.analysis.memory_insights) {
            setMemoryStatus(data.analysis.memory_insights);
          }
          
          // Create analyses for critical findings
          const criticalFindings = data.analysis.predictive_analysis.filter(
            (pred: any) => pred.risk_level === 'critical' || pred.risk_level === 'high'
          );
          
          const newAnalyses = criticalFindings.map((finding: any) => ({
            id: `lstm-${Date.now()}-${Math.random()}`,
            alert: {
              id: finding.machine_id,
              machine: finding.machine_name,
              message: `LSTM Prediction: ${finding.maintenance_actions.map((a: any) => a.reason).join(', ')}`,
              severity: finding.risk_level === 'critical' ? 'critical' : 'warning',
              timestamp: new Date().toLocaleTimeString(),
            } as Alert,
            solution: formatLSTMAnalysis(finding),
            timestamp: new Date().toLocaleTimeString(),
            memoryInsights: data.analysis.memory_insights,
            predictiveAnalysis: [finding],
            riskLevel: finding.risk_level
          }));
          
          if (newAnalyses.length > 0) {
            setAnalyses(prev => [...newAnalyses, ...prev.slice(0, 10)]); // Keep last 10
          }
        }
      }
    } catch (error) {
      console.error('Auto-analysis failed:', error);
    }
  };

  const formatLSTMAnalysis = (finding: any) => {
    let analysis = `🧠 LSTM PREDICTIVE ANALYSIS\n\n`;
    analysis += `Machine: ${finding.machine_name}\n`;
    analysis += `Current Status: ${finding.current_status}\n`;
    analysis += `Risk Level: ${finding.risk_level.toUpperCase()}\n\n`;
    
    if (finding.predictions && Object.keys(finding.predictions).length > 0) {
      analysis += `📊 FUTURE PREDICTIONS (24 steps ahead):\n`;
      for (const [param, predictions] of Object.entries(finding.predictions)) {
        const predArray = predictions as number[];
        const avg = predArray.reduce((a, b) => a + b, 0) / predArray.length;
        const max = Math.max(...predArray);
        const min = Math.min(...predArray);
        analysis += `${param}: Avg ${avg.toFixed(2)}, Range ${min.toFixed(2)}-${max.toFixed(2)}\n`;
      }
      analysis += `\n`;
    }
    
    if (finding.anomalies && Object.keys(finding.anomalies).length > 0) {
      analysis += `⚠️ ANOMALIES DETECTED:\n`;
      for (const [param, anomaly] of Object.entries(finding.anomalies)) {
        const anomalyData = anomaly as any;
        analysis += `${param}: ${anomalyData.severity} severity (score: ${anomalyData.score.toFixed(2)})\n`;
      }
      analysis += `\n`;
    }
    
    if (finding.maintenance_actions && finding.maintenance_actions.length > 0) {
      analysis += `🔧 RECOMMENDED ACTIONS:\n`;
      finding.maintenance_actions.forEach((action: any, index: number) => {
        analysis += `${index + 1}. ${action.action}\n`;
        analysis += `   Priority: ${action.priority}\n`;
        analysis += `   Reason: ${action.reason}\n\n`;
      });
    }
    
    analysis += `📈 MEMORY INSIGHTS:\n`;
    analysis += `This analysis uses LSTM neural networks trained on historical patterns.\n`;
    analysis += `The model considers multi-dimensional time series data for accurate predictions.\n`;
    
    return analysis;
  };

  const saveApiKey = () => {
    localStorage.setItem('groq-api-key', apiKey);
    setIsSettingsOpen(false);
  };

  const analyzeProblem = async (alertData: Alert) => {
    const analysisId = `analysis-${Date.now()}`;
    const loadingAnalysis: Analysis = {
      id: analysisId,
      alert: alertData,
      solution: '',
      timestamp: new Date().toLocaleTimeString(),
      isLoading: true
    };

    setAnalyses(prev => [loadingAnalysis, ...prev]);
    setIsAnalyzing(true);

    try {
      // Try LSTM backend first
      if (backendConnected) {
        const response = await fetch('http://localhost:5000/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            machines: machines,
            query: `Analyze problem: ${alertData.message} on ${alertData.machine}`
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            let solution = formatAdvancedAnalysis(data.analysis);
            
            setAnalyses(prev => 
              prev.map(analysis => 
                analysis.id === analysisId 
                  ? { 
                      ...analysis, 
                      solution, 
                      isLoading: false,
                      memoryInsights: data.analysis.memory_insights,
                      predictiveAnalysis: data.analysis.predictive_analysis,
                      riskLevel: data.analysis.risk_assessment
                    }
                  : analysis
              )
            );
            setIsAnalyzing(false);
            return;
          }
        }
      }

      // Fall back to Groq API
      if (!apiKey) {
        toast({
          title: "Configuration Required",
          description: "Backend unavailable. Please configure Groq API key for fallback.",
          variant: "destructive",
        });
        setIsSettingsOpen(true);
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-32b',
          messages: [
            {
              role: 'system',
              content: `You are an expert industrial automation engineer with LSTM memory capabilities. Provide technical solutions with predictive analysis.`
            },
            {
              role: 'user',
              content: `Machine: ${alertData.machine}
Problem: ${alertData.message}
Severity: ${alertData.severity}
Timestamp: ${alertData.timestamp}

Provide comprehensive technical analysis with predictive maintenance recommendations.`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      let solution = data.choices[0]?.message?.content || 'No solution generated';
      solution = `⚠️ FALLBACK ANALYSIS (Groq API)\n\n${solution}`;

      setAnalyses(prev => 
        prev.map(analysis => 
          analysis.id === analysisId 
            ? { ...analysis, solution, isLoading: false }
            : analysis
        )
      );
    } catch (error) {
      console.error('Error analyzing problem:', error);
      setAnalyses(prev => 
        prev.map(analysis => 
          analysis.id === analysisId 
            ? { 
                ...analysis, 
                solution: 'Error: Analysis failed. Please check backend connection and try again.',
                isLoading: false 
              }
            : analysis
        )
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatAdvancedAnalysis = (analysis: any) => {
    let result = `🧠 INTELLIGENT DIGITAL TWIN ANALYSIS\n\n`;
    
    result += `📊 MEMORY STATUS:\n`;
    if (analysis.memory_insights) {
      result += `Data Points: ${analysis.memory_insights.total_data_points}\n`;
      result += `Machines Monitored: ${analysis.memory_insights.machines_monitored}\n`;
      result += `Parameters Tracked: ${analysis.memory_insights.parameters_tracked}\n`;
      result += `Models Trained: ${analysis.memory_insights.models_trained}\n\n`;
    }
    
    result += `🎯 OVERALL RISK ASSESSMENT: ${analysis.risk_assessment.toUpperCase()}\n\n`;
    
    if (analysis.predictive_analysis && analysis.predictive_analysis.length > 0) {
      result += `🔮 PREDICTIVE MAINTENANCE ANALYSIS:\n`;
      analysis.predictive_analysis.forEach((machine: any, index: number) => {
        result += `\n${index + 1}. Machine: ${machine.machine_name}\n`;
        result += `   Risk Level: ${machine.risk_level}\n`;
        result += `   Status: ${machine.current_status}\n`;
        
        if (machine.maintenance_actions.length > 0) {
          result += `   Recommended Actions:\n`;
          machine.maintenance_actions.forEach((action: any) => {
            result += `   • ${action.action} (${action.priority} priority)\n`;
            result += `     Reason: ${action.reason}\n`;
          });
        }
      });
    }
    
    if (analysis.pattern_matches && analysis.pattern_matches.length > 0) {
      result += `\n🔍 PATTERN ANALYSIS:\n`;
      analysis.pattern_matches.forEach((pattern: any) => {
        result += `• ${pattern.machine}: ${pattern.pattern} detected in ${pattern.parameter}\n`;
        result += `  Value: ${pattern.value}, Threshold: ${pattern.threshold}, Severity: ${pattern.severity}\n`;
      });
    }
    
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      result += `\n💡 INTELLIGENT RECOMMENDATIONS:\n`;
      analysis.recommendations.forEach((rec: any, index: number) => {
        result += `${index + 1}. ${rec.action}\n`;
        if (rec.details) result += `   Details: ${rec.details}\n`;
        if (rec.estimated_downtime) result += `   Estimated Downtime: ${rec.estimated_downtime}\n`;
        if (rec.cost_impact) result += `   Cost Impact: ${rec.cost_impact}\n`;
        result += `\n`;
      });
    }
    
    result += `🤖 Analysis powered by LSTM neural networks + Pattern Recognition\n`;
    result += `⚡ Real-time predictive capabilities with memory retention\n`;
    
    return result;
  };

  // Enhanced search with LSTM backend
  const handleSearch = async () => {
    if (!pendingSearchTerm.trim()) {
      setSearchResult("");
      return;
    }
    
    setSearchLoading(true);
    
    try {
      // Try LSTM backend first
      if (backendConnected) {
        const response = await fetch('http://localhost:5000/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: pendingSearchTerm,
            machines: machines
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            let result = `🧠 ${data.model_used} Analysis\n`;
            result += `${data.offline_mode ? '📱 Offline Mode' : '🌐 Online Mode'}\n\n`;
            result += data.response;
            
            if (data.detailed_analysis) {
              result += `\n\n📊 DETAILED ANALYSIS:\n`;
              result += `Risk Level: ${data.detailed_analysis.risk_assessment}\n`;
              result += `Machines Analyzed: ${data.detailed_analysis.predictive_analysis.length}\n`;
            }
            
            setSearchResult(result);
            setSearchLoading(false);
            return;
          }
        }
      }
      
      // Fall back to Groq API
      if (!apiKey) {
        setSearchResult("⚠️ Backend unavailable and no Groq API key configured. Please set up either the local backend or API key.");
        setSearchLoading(false);
        return;
      }
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-32b',
          messages: [
            {
              role: 'system',
              content: `You are an expert industrial automation engineer with predictive maintenance capabilities.`
            },
            {
              role: 'user',
              content: pendingSearchTerm
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const data = await response.json();
      const result = `⚠️ FALLBACK ANALYSIS (Groq API)\n\n${data.choices[0]?.message?.content || "No response generated"}`;
      setSearchResult(result);
      
    } catch (error) {
      setSearchResult("Error: Unable to get response. Please check backend connection or API key.");
    } finally {
      setSearchLoading(false);
    }
  };

  const getSeverityVariant = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'outline';
      case 'normal':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="glass-card p-4 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Intelligent Digital Twin Agent
          </h2>
          <div className="flex gap-1">
            {backendConnected && (
              <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/20">
                🧠 LSTM Active
              </Badge>
            )}
            {isOfflineMode && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/20">
                📱 Offline Mode
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 relative">
          {memoryStatus && (
            <Badge variant="outline" className="text-xs">
              <Database className="h-3 w-3 mr-1" />
              {memoryStatus.total_data_points} Data Points
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {analyses.length} Analyses
          </Badge>
          <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="icon" className="glass-panel">
                <Settings className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="absolute right-0 top-12 z-10">
              <Card className="glass-card p-4 w-96">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">AI Backend Status</Label>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Backend Connection:</span>
                      <Badge variant={backendConnected ? "default" : "destructive"} className="text-xs">
                        {backendConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>LSTM Models:</span>
                      <span>{memoryStatus?.models_trained || 0} Trained</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Data:</span>
                      <span>{memoryStatus?.total_data_points || 0} Points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode:</span>
                      <span>{isOfflineMode ? "Offline" : "Online"}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Fallback: Groq API Key</Label>
                    </div>
                    <Input
                      type="password"
                      placeholder="Enter Groq API key (fallback)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Button onClick={saveApiKey} className="w-full mt-2" size="sm">
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Critical Alerts for Analysis */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Critical Issues Requiring Analysis</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
          {alerts.filter(alert => alert.severity === 'critical').slice(0, 3).map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.machine}</p>
                <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyzeProblem(alert)}
                disabled={isAnalyzing}
                className="ml-2 flex-shrink-0"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Technical Analysis Results</h3>
        </div>
        
        {/* Enhanced Search Bar with LSTM */}
        <div className="relative mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={backendConnected ? "Ask LSTM-powered AI anything..." : "Ask a technical question..."}
              value={pendingSearchTerm}
              onChange={(e) => setPendingSearchTerm(e.target.value)}
              className="pl-10 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            {backendConnected && (
              <TrendingUp className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary" />
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="ml-2"
            onClick={handleSearch}
            disabled={searchLoading || !pendingSearchTerm.trim()}
          >
            {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        
        {searchLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {backendConnected ? "LSTM neural network analyzing..." : "Searching technical knowledge..."}
          </div>
        ) : searchResult ? (
          <Textarea
            value={searchResult}
            readOnly
            className="text-xs font-mono bg-muted/20 border-primary/20 min-h-[120px] h-[200px] resize-none mb-4"
          />
        ) : null}
        <div className="h-64 overflow-y-auto custom-scrollbar space-y-3">
          <AnimatePresence mode="popLayout">
            {analyses
              .filter(analysis => 
                searchTerm === "" || 
                analysis.alert.machine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                analysis.alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                analysis.solution.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((analysis) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="border rounded-lg p-3 glass-panel"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityVariant(analysis.alert.severity)} className="text-xs">
                      {analysis.alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium">{analysis.alert.machine}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{analysis.timestamp}</span>
                </div>
                
                <div className="text-xs text-muted-foreground mb-2">
                  Problem: {analysis.alert.message}
                </div>

                {analysis.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing technical specifications...
                  </div>
                ) : (
                  <Textarea
                    value={analysis.solution}
                    readOnly
                    className="text-xs font-mono bg-muted/20 border-primary/20 min-h-[240px] h-[480px] resize-none"
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {analyses.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No analyses yet. Click analyze on critical alerts to get technical solutions.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
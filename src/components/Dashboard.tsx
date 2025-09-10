import { useState, useEffect, useRef } from "react";
import { TelemetryCards } from "./TelemetryCards";
import { AlertsPanel } from "./AlertsPanel";
import { KPIStats } from "./KPIStats";
import { TrendCharts } from "./TrendCharts";
import { ThreeDMap } from "./ThreeDMap";
import { generateMockData } from "../utils/mockData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, RotateCcw, Play, Sun, Moon } from "lucide-react";
import GPTOSSAgent from "./GPTOSSAgent";


export const Dashboard = () => {
  const [data, setData] = useState(generateMockData());
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [lastAlertAnalysis, setLastAlertAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateMockData());
    }, 10000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Helper to get alerts from adjusted machines
  const getAlertsFromMachines = (machines) => {
    return machines.filter(m => m.status === 'critical').map((machine) => {
      let msg = '';
      if (machine.telemetry.temperature > 85) msg = '⚠️ Motor is overheating';
      else if (machine.telemetry.load > 90) msg = '⚠️ Load exceeds safe threshold';
      else if (machine.telemetry.oilLevel < 20) msg = '⚠️ Oil level critically low';
      else if (machine.telemetry.vibration > 40) msg = '⚠️ Joints vibrating abnormally';
      else if (machine.telemetry.pressure < 2 || machine.telemetry.pressure > 10) msg = '⚠️ Hydraulic pressure unstable';
      else if (machine.telemetry.noiseLevel > 110) msg = '⚠️ Noise levels exceed safety threshold';
      return {
        id: `alert-${machine.id}`,
        machine: machine.name,
        message: msg,
        severity: 'critical',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      };
    });
  };

  // Helper to extract trend data from machines
  const getTrendDataFromMachines = (machines) => {
    // For each metric, build an array of { time, value }
    // Use machine name as time label for simplicity
    return {
      temperature: machines.map(m => ({ time: m.name, value: m.telemetry.temperature })),
      rpm: machines.map(m => ({ time: m.name, value: m.telemetry.motorSpeed || 0 })),
      vibration: machines.map(m => ({ time: m.name, value: m.telemetry.vibration })),
      load: machines.map(m => ({ time: m.name, value: m.telemetry.load })),
    };
  };

  // Store adjusted machines from ThreeDMap
  const [adjustedMachines, setAdjustedMachines] = useState(data.machines);

  // Callback to receive adjusted machines from ThreeDMap
  const handleAdjustedMachines = (machines) => {
    setAdjustedMachines(machines);
  };

  // Handle alert click to send to AI agent
  const handleAlertClick = async (alert) => {
    // Create a maintenance-focused prompt for the AI
    const maintenancePrompt = `🚨 EMERGENCY MAINTENANCE ALERT ANALYSIS REQUIRED

Machine: ${alert.machine}
Issue: ${alert.message}
Severity: ${alert.severity.toUpperCase()}
Time: ${alert.timestamp}

As an Industrial Maintenance Engineer, please provide:

⚠️ IMMEDIATE SAFETY ACTIONS:
- Emergency shutdown procedures if required
- Safety hazards and PPE requirements
- Personnel evacuation if needed

🔧 TECHNICAL ANALYSIS:
- Root cause analysis for this specific issue
- System components that may be affected
- Failure mode identification

📋 MAINTENANCE PROCEDURES:
- Step-by-step repair/inspection procedures
- Required tools and spare parts
- LOTO (Lockout/Tagout) requirements
- Quality control checkpoints

⏰ URGENCY ASSESSMENT:
- Can this wait for scheduled maintenance?
- Risk of cascading failures
- Production impact assessment

🛡️ SAFETY PROTOCOLS:
- Specific PPE requirements for this repair
- Environmental hazards (confined space, electrical, etc.)
- Two-person work requirements

Please provide immediate actionable guidance for our maintenance team.`;

    try {
      // Send the alert directly to the AI backend
      const response = await fetch('http://localhost:5000/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: maintenancePrompt,
          machines: adjustedMachines
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Store the analysis and show it
        setLastAlertAnalysis({
          alert: alert,
          analysis: data.response,
          modelUsed: data.model_used,
          timestamp: new Date().toLocaleTimeString()
        });
        setShowAnalysis(true);
        
        console.log('Alert sent to AI agent:', data.response);
      }
    } catch (error) {
      console.error('Failed to send alert to AI agent:', error);
      // toast.error('Failed to send alert to AI agent');
    }
  };

  return (
    <div className={`min-h-screen p-4 transition-colors duration-500 ${isLightMode ? 'bg-white text-black' : 'bg-background text-foreground'}`}>
      {/* AI Analysis Modal */}
      {showAnalysis && lastAlertAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-5xl w-full h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-primary">🤖 AI Maintenance Analysis</h3>
                <Button variant="ghost" onClick={() => setShowAnalysis(false)}>✕</Button>
              </div>
              
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="text-sm font-medium">{lastAlertAnalysis.alert.machine}</div>
                <div className="text-sm text-muted-foreground">{lastAlertAnalysis.alert.message}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Analyzed at {lastAlertAnalysis.timestamp} • Model: {lastAlertAnalysis.modelUsed}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-muted/20 p-4 rounded-lg h-full">
                <div className="prose prose-sm max-w-none text-sm leading-relaxed"
                     style={{
                       fontFamily: 'system-ui, -apple-system, sans-serif'
                     }}
                     dangerouslySetInnerHTML={{
                       __html: (() => {
                         let content = lastAlertAnalysis.analysis;
                         
                         // Enhanced table parsing - handle markdown tables
                         content = content.replace(/(\|[^\n]*\|\n)+/g, (tableMatch) => {
                           const lines = tableMatch.trim().split('\n');
                           const tableRows = [];
                           
                           for (let i = 0; i < lines.length; i++) {
                             const line = lines[i].trim();
                             if (line.startsWith('|') && line.endsWith('|')) {
                               // Skip separator lines like |--------|--------|
                               if (line.includes('---')) continue;
                               
                               const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
                               const isHeader = i === 0 || (i === 1 && lines[i-1] && lines[i-1].includes('---'));
                               
                               const cellsHtml = cells.map(cell => {
                                 const style = isHeader 
                                   ? 'border: 1px solid #374151; padding: 12px 16px; background: #374151; color: white; font-weight: bold; text-align: left;'
                                   : 'border: 1px solid #d1d5db; padding: 12px 16px; background: #ffffff; vertical-align: top;';
                                 return `<td style="${style}">${cell}</td>`;
                               }).join('');
                               
                               tableRows.push(`<tr>${cellsHtml}</tr>`);
                             }
                           }
                           
                           if (tableRows.length > 0) {
                             return `<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${tableRows.join('')}</table>`;
                           }
                           return tableMatch;
                         });
                         
                         // Apply other formatting
                         content = content
                           .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #dc2626; font-weight: bold;">$1</strong>')
                           .replace(/\*(.*?)\*/g, '<em style="color: #059669; font-style: italic;">$1</em>')
                           .replace(/^### (.*$)/gm, '<h3 style="color: #2563eb; font-size: 1.0em; font-weight: 600; margin: 1.2em 0 0.6em 0; border-bottom: 1px solid #2563eb; padding-bottom: 0.2em;">$1</h3>')
                           .replace(/^## (.*$)/gm, '<h2 style="color: #dc2626; font-size: 1.1em; font-weight: bold; margin: 1.5em 0 0.8em 0; border-bottom: 2px solid #dc2626; padding-bottom: 0.3em;">$1</h2>')
                           .replace(/^# (.*$)/gm, '<h1 style="color: #dc2626; font-size: 1.2em; font-weight: bold; margin: 1.5em 0 1em 0; text-transform: uppercase; letter-spacing: 0.3px;">$1</h1>')
                           .replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid #fbbf24; background: #fffbeb; padding: 8px 12px; margin: 1em 0; border-radius: 4px; font-style: italic; color: #92400e; font-size: 0.9em;">$1</blockquote>')
                           .replace(/^• (.*$)/gm, '<div style="margin: 0.3em 0; padding-left: 1.2em; position: relative;"><span style="position: absolute; left: 0; color: #2563eb; font-weight: bold;">•</span>$1</div>')
                           .replace(/^- (.*$)/gm, '<div style="margin: 0.3em 0; padding-left: 1.2em; position: relative;"><span style="position: absolute; left: 0; color: #2563eb; font-weight: bold;">•</span>$1</div>')
                           .replace(/^(\d+)\. (.*$)/gm, '<div style="margin: 0.8em 0; padding: 0.6em; background: #f0f9ff; border-left: 3px solid #2563eb; border-radius: 3px;"><span style="font-weight: bold; color: #2563eb; font-size: 1.0em; background: #dbeafe; padding: 2px 6px; border-radius: 4px; margin-right: 0.5em;">$1</span>$2</div>')
                           .replace(/1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|7️⃣|8️⃣|9️⃣/g, (emoji) => {
                             const romanNumerals = {
                               '1️⃣': 'I',
                               '2️⃣': 'II', 
                               '3️⃣': 'III',
                               '4️⃣': 'IV',
                               '5️⃣': 'V',
                               '6️⃣': 'VI',
                               '7️⃣': 'VII',
                               '8️⃣': 'VIII',
                               '9️⃣': 'IX'
                             };
                             return `<span style="font-size: 1.1em; font-weight: bold; margin-right: 0.5em; display: inline-block; background: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">${romanNumerals[emoji]}</span>`;
                           })
                           .replace(/---+/g, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; opacity: 0.6;">')
                           .replace(/Failure Mode Identification/gi, '<h3 style="color: #dc2626; font-size: 1.1em; font-weight: bold; margin: 1.5em 0 0.8em 0; border-bottom: 2px solid #dc2626; padding-bottom: 0.3em;">Failure Mode Identification</h3>')
                           .replace(/– The most likely immediate failure mode is/gi, '<p style="color: #ffffff; margin: 0.5em 0; line-height: 1.5;">– The most likely immediate failure mode is</p>')
                           .replace(/"Loss of lubricating oil → Insufficient hydraulic pressure → Potential seizure of moving components\."/gi, '<strong style="color: #ff6b6b; background: #2d1b1b; padding: 4px 8px; border-radius: 4px; font-weight: bold;">"Loss of lubricating oil → Insufficient hydraulic pressure → Potential seizure of moving components."</strong>')
                           .replace(/If not corrected, it can lead to:/gi, '<p style="color: #ffffff; margin: 0.5em 0; line-height: 1.5;">If not corrected, it can lead to:</p>')
                           .replace(/• Bearing wear or catastrophic failure of the injection screw\/ram\./gi, '<p style="color: #ffffff; margin: 0.3em 0; padding-left: 1.2em; position: relative;"><span style="position: absolute; left: 0; color: #fbbf24; font-weight: bold;">•</span>Bearing wear or catastrophic failure of the injection screw/ram.</p>')
                           .replace(/• Over-heating of the hydraulic pump → pump burnout\./gi, '<p style="color: #ffffff; margin: 0.3em 0; padding-left: 1.2em; position: relative;"><span style="position: absolute; left: 0; color: #fbbf24; font-weight: bold;">•</span>Over-heating of the hydraulic pump → pump burnout.</p>')
                           .replace(/\n\s*\n\s*\n/g, '<br>') // Remove excessive blank lines
                           .replace(/\n\s*\n/g, '<br>') // Handle double line breaks
                           .replace(/\n(?=[A-Z][^a-z]*:)/g, '<br><br>') // Add breaks before section headers
                           .replace(/\n/g, ' '); // Convert remaining newlines to spaces
                         
                         // Split content and ensure everything is captured, especially at the end
                         const sections = content.split(/<br><br>/);
                         content = sections.map(section => {
                           section = section.trim();
                           if (section && !section.startsWith('<') && section.length > 3) {
                             // Check if it's a section header or regular content
                             if (section.match(/^[A-Z][^<]*:/)) {
                               return `<div style="margin: 1em 0; font-weight: 600; color: #059669;">${section}</div>`;
                             } else {
                               return `<p style="margin: 0.4em 0; line-height: 1.5; color: #374151;">${section}</p>`;
                             }
                           }
                           return section;
                         }).join('<br>');
                         
                         // Final cleanup to ensure no content is lost
                         content = content.replace(/<br>\s*<br>/g, '<br>'); // Remove excessive breaks
                         
                         return content;
                       })()
                     }}
                />
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                <Button onClick={() => setShowAnalysis(false)} className="flex-1">
                  Close Analysis
                </Button>
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(lastAlertAnalysis.analysis);
                }}>
                  📋 Copy to Clipboard
                </Button>
                <Button variant="outline" onClick={() => {
                  const printContent = `
                    <html>
                      <head><title>Maintenance Analysis Report</title></head>
                      <body style="font-family: system-ui, sans-serif; padding: 20px;">
                        <h1 style="color: #dc2626;">🏭 MAINTENANCE ANALYSIS REPORT</h1>
                        <p><strong>Machine:</strong> ${lastAlertAnalysis.alert.machine}</p>
                        <p><strong>Alert:</strong> ${lastAlertAnalysis.alert.message}</p>
                        <p><strong>Analysis Time:</strong> ${lastAlertAnalysis.timestamp}</p>
                        <hr>
                        <div>${lastAlertAnalysis.analysis.replace(/\n/g, '<br>')}</div>
                      </body>
                    </html>`;
                  const printWindow = window.open('', '_blank');
                  printWindow?.document.write(printContent);
                  printWindow?.document.close();
                  printWindow?.print();
                }}>
                  🖨️ Print Report
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text ${isLightMode ? 'text-black' : 'text-transparent'}`}>
              Digital Twin Factory Monitor
            </h1>
            <p className={`mt-1 ${isLightMode ? 'text-gray-700' : 'text-muted-foreground'}`}>
              Real-time industrial machine monitoring & analytics
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsLightMode((prev) => !prev)}
              className="glass-panel"
            >
              {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className={isMapExpanded ? "flex items-center justify-center w-screen h-screen" : "grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[80vh] items-start pt-2"}>
        {/* Left Column - Telemetry & KPIs */}
        <div
          className={`space-y-6 transition-all duration-1000 ${isMapExpanded ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}
        >
            <Card className="glass-card p-4">
              <h2 className="text-xl font-bold mb-2">Avg Live Telemetry</h2>
              <TelemetryCards data={data.telemetry} showTitle={false} isAverage={true} />
            </Card>
            <Card className="glass-card p-4">
              <h2 className="text-xl font-bold mb-2">KPI Dashboard</h2>
              <KPIStats data={data.kpis} showTitle={false} />
            </Card>
        </div>

        {/* Center Column - 3D Map and AI Agent below */}
        <div className={isMapExpanded ? "flex flex-col items-center justify-center w-full h-full" : "lg:col-span-1 flex flex-col gap-6"}>
          <Card
            className={`glass-card rounded-lg flex items-center justify-center transition-all duration-1000 ${isMapExpanded ? 'w-full h-full max-w-7xl max-h-[90vh]' : 'w-full h-[600px]'}`}
          >
            <div className={`flex items-center justify-center w-full h-full transition-all duration-1000`}>
              <ThreeDMap machines={data.machines} isMapExpanded={isMapExpanded} setIsMapExpanded={setIsMapExpanded} onAdjustedMachines={handleAdjustedMachines} />
            </div>
          </Card>
          {!isMapExpanded && (
            <Card className="glass-card p-4">
              <h2 className="text-xl font-bold mb-2">GPT-OSS AI Agent</h2>
              <GPTOSSAgent 
                machines={adjustedMachines}
              />
            </Card>
          )}
        </div>

        {/* Right Column - Alerts & Charts */}
        <div className={`space-y-6 transition-all duration-1000 ${isMapExpanded ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
          <Card className="glass-card p-4">
            <h2 className="text-xl font-bold mb-2">System Alerts</h2>
            <AlertsPanel 
              alerts={getAlertsFromMachines(adjustedMachines)} 
              showTitle={false} 
              onAlertClick={handleAlertClick}
            />
          </Card>
          <Card className="glass-card p-4">
            <h2 className="text-xl font-bold mb-2">Trend Analysis</h2>
            <TrendCharts data={getTrendDataFromMachines(data.machines)} showTitle={false} />
          </Card>
        </div>
      </div>
    </div>
  );
};
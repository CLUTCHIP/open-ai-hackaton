import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Alert {
  id: string;
  machine: string;
  message: string;
  severity: 'critical' | 'warning' | 'normal';
  timestamp: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
  showTitle?: boolean;
  onAlertClick?: (alert: Alert) => void;
}

export const AlertsPanel = ({ alerts, showTitle = true, onAlertClick }: AlertsPanelProps) => {
  const [clickedAlerts, setClickedAlerts] = useState(new Set());

  const handleAlertClick = (alert: Alert) => {
    if (onAlertClick) {
      setClickedAlerts(prev => new Set([...prev, alert.id]));
      onAlertClick(alert);
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'normal':
        return <CheckCircle className="h-4 w-4" />;
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

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'status-critical';
      case 'warning':
        return 'status-warning';
      case 'normal':
        return 'status-normal';
    }
  };

  return (
    <Card className="glass-card p-4">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">System Alerts</h2>
          <Badge variant="outline" className="text-xs">
            {alerts.length} Active
          </Badge>
        </div>
      )}
      <div className="h-80 overflow-y-auto custom-scrollbar space-y-2">
        <AnimatePresence mode="popLayout">
          {alerts.map((alert, index) => {
            const isClicked = clickedAlerts.has(alert.id);
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} backdrop-blur-sm cursor-pointer hover:bg-opacity-80 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${isClicked ? 'bg-primary/10 border-primary' : ''}`}
                onClick={() => handleAlertClick(alert)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isClicked ? <Send className="h-4 w-4 text-primary" /> : getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{alert.machine}</p>
                      <div className="flex items-center gap-2">
                        {isClicked && (
                          <Badge variant="outline" className="text-xs bg-primary/20 text-primary">
                            Sent to AI
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    {onAlertClick && !isClicked && (
                      <p className="text-xs text-primary mt-1 opacity-70">
                        💬 Click to send to AI Agent for analysis
                      </p>
                    )}
                    {isClicked && (
                      <p className="text-xs text-primary mt-1">
                        ✅ Sent to AI Agent for maintenance analysis
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
};
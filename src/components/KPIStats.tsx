import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface KPIData {
  totalMachines: number;
  criticalStatus: number;
  warningStatus: number;
  avgTemperature: number;
  avgLoad: number;
  avgVibration: number;
  energyConsumption: number;
}

interface KPIStatsProps {
  data: KPIData;
}

export const KPIStats = ({ data, showTitle = true }: KPIStatsProps & { showTitle?: boolean }) => {
  const kpiItems = [
    {
      label: "Total Machines",
      value: data.totalMachines,
      icon: Activity,
      color: "text-primary",
      bgColor: "from-primary/20 to-primary/5"
    },
    {
      label: "Critical Status",
      value: data.criticalStatus,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "from-destructive/20 to-destructive/5"
    },
    {
      label: "Warning Status", 
      value: data.warningStatus,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "from-warning/20 to-warning/5"
    },
    {
      label: "Avg Temperature",
      value: `${data.avgTemperature}°C`,
      icon: TrendingUp,
      color: "temp-indicator",
      bgColor: "from-temperature/20 to-temperature/5"
    },
    {
      label: "Avg Load",
      value: `${data.avgLoad}%`,
      icon: Zap,
      color: "energy-indicator",
      bgColor: "from-energy/20 to-energy/5"
    },
    {
      label: "Energy Usage",
      value: `${data.energyConsumption}kW`,
      icon: Zap,
      color: "text-yellow-400",
      bgColor: "from-yellow-400/20 to-yellow-400/5"
    }
  ];

  return (
    <div className="space-y-4">
      {showTitle && (
        <h2 className="text-xl font-semibold text-foreground">KPI Dashboard</h2>
      )}
      <div className="grid grid-cols-2 gap-3">
        {kpiItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`glass-card p-4 bg-gradient-to-br ${item.bgColor} border-primary/20 hover:border-primary/40 transition-all duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {item.label}
                  </p>
                  <motion.p 
                    className={`text-xl font-bold ${item.color} mt-1`}
                    key={item.value}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {item.value}
                  </motion.p>
                </div>
                <item.icon className={`h-6 w-6 ${item.color} opacity-70`} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
import { Card } from "@/components/ui/card";
import { Thermometer, Gauge, Activity, Droplets, Zap, Volume2 } from "lucide-react";
import { motion } from "framer-motion";

interface TelemetryData {
  temperature: number;
  vibration: number;
  pressure: number;
  noiseLevel: number;
  load: number;
  oilLevel: number;
  humidity: number;
}

interface TelemetryCardsProps {
  data: TelemetryData;
  showTitle?: boolean;
  isAverage?: boolean;
}

export const TelemetryCards = ({ data, showTitle = true, isAverage = false }: TelemetryCardsProps) => {
  // Helper to format numbers to integer
  const formatValue = (value: number) => {
    if (typeof value === 'number') {
      return Math.round(value);
    }
    return value;
  };

  const telemetryItems = [
    {
      label: "Temperature",
      value: formatValue(data.temperature),
      unit: "°C",
      icon: Thermometer,
      color: "temp-indicator",
      bgColor: "from-temperature/20 to-temperature/5"
    },
    {
      label: "Vibration", 
      value: formatValue(data.vibration),
      unit: "Hz",
      icon: Activity,
      color: "vibration-indicator",
      bgColor: "from-vibration/20 to-vibration/5"
    },
    {
      label: "Pressure",
      value: formatValue(data.pressure),
      unit: "PSI",
      icon: Gauge,
      color: "pressure-indicator", 
      bgColor: "from-pressure/20 to-pressure/5"
    },
    {
      label: "Noise",
      value: formatValue(data.noiseLevel),
      unit: "dB",
      icon: Volume2,
      color: "text-yellow-400",
      bgColor: "from-yellow-400/20 to-yellow-400/5"
    },
    {
      label: "Load",
      value: formatValue(data.load),
      unit: "%",
      icon: Zap,
      color: "energy-indicator",
      bgColor: "from-energy/20 to-energy/5"
    },
    {
      label: "Oil Level",
      value: formatValue(data.oilLevel),
      unit: "%",
      icon: Droplets,
      color: "text-blue-400",
      bgColor: "from-blue-400/20 to-blue-400/5"
    }
  ];

  return (
    <div className="space-y-4">
      {showTitle && (
        <h2 className="text-xl font-semibold text-foreground">{isAverage ? 'Avg Live Telemetry' : 'Live Telemetry'}</h2>
      )}
      <div className="grid grid-cols-2 gap-3">
        {telemetryItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`glass-card p-4 bg-gradient-to-br ${item.bgColor} border-primary/20 hover:border-primary/40 transition-all duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="flex items-baseline gap-1">
                    <motion.span 
                      className={`text-2xl font-bold ${item.color}`}
                      key={item.value}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.value}
                    </motion.span>
                    <span className="text-sm text-muted-foreground">{item.unit}</span>
                  </div>
                </div>
                <item.icon className={`h-8 w-8 ${item.color}`} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";

interface TrendData {
  temperature: Array<{ time: string; value: number }>;
  rpm: Array<{ time: string; value: number }>;
  vibration: Array<{ time: string; value: number }>;
  load: Array<{ time: string; value: number }>;
}

interface TrendChartsProps {
  data: TrendData;
  showTitle?: boolean;
}

export const TrendCharts = ({ data, showTitle = true }: TrendChartsProps) => {
  return (
    <div className="space-y-4">
      {showTitle && (
        <h2 className="text-xl font-semibold text-foreground">Trend Analysis</h2>
      )}
      
      {/* Temperature Chart */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Temperature Trend</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.temperature}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--temperature))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--temperature))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* RPM Chart */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">RPM Trend</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.rpm}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Vibration Chart */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Vibration Levels</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.vibration}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--vibration))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--vibration))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
export interface TelemetryData {
  temperature: number;
  motorSpeed: number;
  pressure: number;
  vibration: number;
  load: number;
  humidity: number;
  oilLevel: number;
  noiseLevel: number;
}

export interface Alert {
  id: string;
  machine: string;
  message: string;
  severity: 'critical' | 'warning' | 'normal';
  timestamp: string;
}

export interface Machine {
  id: string;
  name: string;
  position: [number, number, number];
  status: 'normal' | 'warning' | 'critical' | 'offline';
  telemetry: TelemetryData;
}

export interface KPIData {
  totalMachines: number;
  criticalStatus: number;
  warningStatus: number;
  avgTemperature: number;
  avgLoad: number;
  avgVibration: number;
  energyConsumption: number;
}

export interface TrendData {
  temperature: Array<{ time: string; value: number }>;
  rpm: Array<{ time: string; value: number }>;
  vibration: Array<{ time: string; value: number }>;
  load: Array<{ time: string; value: number }>;
}

const generateRandomValue = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateTimeStamp = (minutesAgo: number) => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - minutesAgo);
  return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
};

const badTypes = ['overheat', 'overload', 'lowoil', 'vibration', 'pressure', 'noise'];
const badMessages = {
  overheat: '⚠️ Motor is overheating',
  overload: '⚠️ Load exceeds safe threshold',
  lowoil: '⚠️ Oil level critically low',
  vibration: '⚠️ Joints vibrating abnormally',
  pressure: '⚠️ Hydraulic pressure unstable',
  noise: '⚠️ Noise levels exceed safety threshold',
};

const generateTelemetryData = (badType?: string): TelemetryData => {
  let telemetry = {
    temperature: Math.floor(Math.random() * (70 - 40 + 1)) + 40,
    motorSpeed: Math.floor(Math.random() * (6000 - 2000 + 1)) + 2000,
    pressure: Math.random() * (7 - 3) + 3,
    vibration: Math.random() * 20,
    load: Math.random() * (70 - 30) + 30,
    humidity: Math.random() * (60 - 40) + 40,
    oilLevel: Math.random() * (100 - 60) + 60,
    noiseLevel: Math.random() * (90 - 60) + 60,
  };
  if (badType === 'overheat') telemetry.temperature = Math.floor(Math.random() * (100 - 86 + 1)) + 86;
  if (badType === 'overload') telemetry.load = Math.random() * (100 - 91) + 91;
  if (badType === 'lowoil') telemetry.oilLevel = Math.random() * 19;
  if (badType === 'vibration') telemetry.vibration = Math.random() * (50 - 41) + 41;
  if (badType === 'pressure') telemetry.pressure = Math.random() < 0.5 ? Math.random() * 2 : Math.random() * (12 - 11) + 11;
  if (badType === 'noise') telemetry.noiseLevel = Math.random() * (120 - 111) + 111;
  return telemetry;
};

const machineNames = [
  'mixing machine',
  'cnc cutting',
  'cnc cutting2',
  'coloring chamber',
  'coloring chamber2',
  'CNC ROUTER',
  'CNC ROUTER2',
  'CNC Router 20',
  'CNC Router 21',
  'knuth',
  'knuth2',
  'knuth3',
  'injection machine',
  'injection machine2',
  'injection machine3',
  'injection machine4',
  'injection machine5',
  'injection machine6',
  'injection machine7',
  'injection machine8',
  'injection machine9'
];
const statuses: Machine['status'][] = ['normal', 'warning', 'critical', 'offline'];

const generateMachines = (): Machine[] => {
  // Pick three machines to be in a critical state
  const criticalIndices: number[] = [];
  while (criticalIndices.length < 3) {
    const idx = Math.floor(Math.random() * machineNames.length);
    if (!criticalIndices.includes(idx)) criticalIndices.push(idx);
  }
  const criticalTypes = ['overheat', 'overload', 'lowoil', 'vibration', 'pressure', 'noise'];
  return machineNames.map((name, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    let telemetry;
    let status: Machine['status'] = 'normal';
    if (criticalIndices.includes(i)) {
      const badType = criticalTypes[criticalIndices.indexOf(i) % criticalTypes.length];
      telemetry = generateTelemetryData(badType);
      status = 'critical';
    } else {
      telemetry = generateTelemetryData();
      if (
        telemetry.temperature > 80 ||
        telemetry.load > 85 ||
        telemetry.oilLevel < 25 ||
        telemetry.vibration > 35 ||
        telemetry.pressure < 3 || telemetry.pressure > 9 ||
        telemetry.noiseLevel > 100
      ) {
        status = 'warning';
      }
    }
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      position: [(col - 1.5) * 3, 0, (row - 1) * 3] as [number, number, number],
      status,
      telemetry,
    };
  });
};

const generateKPIData = (machines: Machine[]): KPIData => {
  const criticalCount = machines.filter(m => m.status === 'critical').length;
  const warningCount = machines.filter(m => m.status === 'warning').length;
  const avgTemp = Math.floor(machines.reduce((sum, m) => sum + m.telemetry.temperature, 0) / machines.length);
  
  return {
    totalMachines: machines.length,
    criticalStatus: criticalCount,
    warningStatus: warningCount,
    avgTemperature: avgTemp,
    avgLoad: generateRandomValue(75, 85),
    avgVibration: generateRandomValue(3, 6),
    energyConsumption: generateRandomValue(450, 650),
  };
};

const generateTrendData = (): TrendData => {
  const generateTrendPoints = (baseValue: number, variance: number) => {
    return Array.from({ length: 12 }, (_, i) => ({
      time: generateTimeStamp(i * 5),
      value: baseValue + Math.floor(Math.random() * variance) - variance / 2,
    }));
  };

  return {
    temperature: generateTrendPoints(75, 20),
    rpm: generateTrendPoints(2400, 400),
    vibration: generateTrendPoints(5, 4),
    load: generateTrendPoints(80, 30),
  };
};

export const generateMockData = () => {
  const machines = generateMachines();
  return {
    telemetry: generateTelemetryData(),
    alerts: machines.filter(m => m.status === 'critical').map((machine) => {
      let msg = '';
      if (machine.telemetry.temperature > 85) msg = badMessages.overheat;
      else if (machine.telemetry.load > 90) msg = badMessages.overload;
      else if (machine.telemetry.oilLevel < 20) msg = badMessages.lowoil;
      else if (machine.telemetry.vibration > 40) msg = badMessages.vibration;
      else if (machine.telemetry.pressure < 2 || machine.telemetry.pressure > 10) msg = badMessages.pressure;
      else if (machine.telemetry.noiseLevel > 110) msg = badMessages.noise;
      return {
        id: `alert-${machine.id}`,
        machine: machine.name,
        message: msg,
        severity: 'critical',
        timestamp: generateTimeStamp(0),
      };
    }),
    machines,
    kpis: generateKPIData(machines),
    trends: generateTrendData(),
  };
};
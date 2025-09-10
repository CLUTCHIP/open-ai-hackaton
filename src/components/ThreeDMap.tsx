
import React, { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Html, useGLTF } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { RotateCcw, Maximize2, Play } from "lucide-react";
import * as THREE from "three";


interface TelemetryData {
  temperature: number;
  motorSpeed: number;
  pressure: number;
  vibration: number;
  load: number;
  humidity: number;
  oilLevel: number;
  noiseLevel: number;
}

interface Machine {
  id: string;
  name: string;
  position: [number, number, number];
  status: 'normal' | 'warning' | 'critical' | 'offline';
  telemetry: TelemetryData;
}

interface ThreeDMapProps {
  machines: Machine[];
  isMapExpanded?: boolean;
  setIsMapExpanded?: (expanded: boolean) => void;
  onAdjustedMachines?: (machines: Machine[]) => void;
}

// GLBMap definition
const GLBMap = React.forwardRef(({ machines }: { machines: Machine[] }, ref) => {
  const gltf = useGLTF('/map.glb');
  const [hoveredMachine, setHoveredMachine] = useState<Machine | null>(null);
  const [tooltipPos, setTooltipPos] = useState<[number, number, number] | null>(null);
  const statusColor = {
    normal: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
    offline: '#6b7280',
  };
  // Expose gltf to parent via ref
  React.useImperativeHandle(ref, () => ({ gltf }), [gltf]);
  if (!gltf || !gltf.scene) {
    return <Text position={[0, 2, 0]} fontSize={0.5} color="red">Map not loaded</Text>;
  }
  // Center the map
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new THREE.Vector3());
  gltf.scene.position.x -= center.x;
  gltf.scene.position.y -= center.y;
  gltf.scene.position.z -= center.z;

  // Color original machine meshes only
  useEffect(() => {
    if (!gltf || !gltf.scene) return;
    machines.forEach((machine) => {
      const possibleNames = [
        machine.name,
        machine.name.toLowerCase(),
        machine.name.toUpperCase(),
        machine.name.replace(/\s+/g, ''),
        machine.name.replace(/\s+/g, '-'),
        machine.name.replace(/\s+/g, '_'),
      ];
      let meshObj: THREE.Mesh | null = null;
      for (const name of possibleNames) {
        const found = gltf.scene.getObjectByName(name);
        if (found && found.type === 'Mesh') {
          meshObj = found as THREE.Mesh;
          break;
        }
      }
      if (meshObj) {
        meshObj.material = new THREE.MeshStandardMaterial({ color: statusColor[machine.status] });
        meshObj.userData.machine = machine;
      }
    });
  }, [gltf, machines]);

  // Raycasting for hover tooltips
  useFrame(({ camera, mouse }) => {
    if (!gltf || !gltf.scene) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    let found = false;
    for (const machine of machines) {
      const possibleNames = [
        machine.name,
        machine.name.toLowerCase(),
        machine.name.toUpperCase(),
        machine.name.replace(/\s+/g, ''),
        machine.name.replace(/\s+/g, '-'),
        machine.name.replace(/\s+/g, '_'),
      ];
      for (const name of possibleNames) {
        const meshObj = gltf.scene.getObjectByName(name);
        if (meshObj && meshObj.type === 'Mesh') {
          const intersects = raycaster.intersectObject(meshObj, true);
          if (intersects.length > 0) {
            setHoveredMachine(machine);
            const pos = meshObj.getWorldPosition(new THREE.Vector3());
            setTooltipPos([pos.x, pos.y, pos.z]);
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    if (!found) {
      setHoveredMachine(null);
      setTooltipPos(null);
    }
  });

  return (
    <>
      {/* Render the GLB scene with original meshes only */}
      <primitive object={gltf.scene} scale={[5, 5, 5]} />
      {/* Tooltip for hovered machine */}
      {hoveredMachine && tooltipPos && (
        <Html position={tooltipPos} center style={{ pointerEvents: 'none', background: 'rgba(30,41,59,0.95)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '12px', minWidth: '180px', boxShadow: '0 2px 8px #0008' }}>
          <div><strong>{hoveredMachine.name}</strong></div>
          <div>Temp: {hoveredMachine.telemetry.temperature}°C</div>
          <div>Motor: {hoveredMachine.telemetry.motorSpeed} RPM</div>
          <div>Pressure: {hoveredMachine.telemetry.pressure.toFixed(2)} bar</div>
          <div>Vibration: {hoveredMachine.telemetry.vibration.toFixed(2)} mm/s</div>
          <div>Load: {hoveredMachine.telemetry.load.toFixed(2)} kW</div>
          <div>Humidity: {hoveredMachine.telemetry.humidity.toFixed(2)}%</div>
          <div>Oil: {hoveredMachine.telemetry.oilLevel.toFixed(2)}%</div>
          <div>Noise: {hoveredMachine.telemetry.noiseLevel.toFixed(2)} dB</div>
        </Html>
      )}
    </>
  );
});

export const ThreeDMap = ({ machines, isMapExpanded, setIsMapExpanded }: ThreeDMapProps) => {
  const [isCeilingVisible, setIsCeilingVisible] = useState(true);
  const glbMapRef = useRef<any>(null);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const controlsRef = useRef<any>();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Track up to 3 machines in enforced red state, each with a random duration between 1-2 min
  type TimedMachine = { id: string; start: number; duration: number };
  const [redMachines, setRedMachines] = useState<TimedMachine[]>([]);
  const [orangeMachines, setOrangeMachines] = useState<TimedMachine[]>([]);

  useEffect(() => {
    const now = Date.now();
    // RED (critical)
    setRedMachines((prev) => {
      let filtered = prev.filter(rm => now - rm.start < rm.duration);
      const currentRedIds = filtered.map(rm => rm.id);
      const newCriticals = machines.filter(m => m.status === 'critical' && !currentRedIds.includes(m.id));
      for (const m of newCriticals) {
        if (filtered.length < 3) {
          const duration = 60000 + Math.floor(Math.random() * 60000);
          filtered.push({ id: m.id, start: now, duration });
        }
      }
      return filtered;
    });
    // ORANGE (warning) - always at least one
    setOrangeMachines((prev) => {
      let filtered = prev.filter(om => now - om.start < om.duration);
      const currentOrangeIds = filtered.map(om => om.id);
      const newWarnings = machines.filter(m => m.status === 'warning' && !currentOrangeIds.includes(m.id));
      for (const m of newWarnings) {
        if (filtered.length < 2) {
          const duration = 60000 + Math.floor(Math.random() * 60000);
          filtered.push({ id: m.id, start: now, duration });
        }
      }
      // Guarantee at least one orange machine
      if (filtered.length === 0) {
        // Try warning, then normal, then any machine
        let candidate = machines.find(m => m.status === 'warning');
        if (!candidate) candidate = machines.find(m => m.status === 'normal');
        if (!candidate) candidate = machines.find(m => m.status !== 'offline');
        if (!candidate && machines.length > 0) candidate = machines[0];
        if (candidate) {
          const duration = 60000 + Math.floor(Math.random() * 60000);
          filtered.push({ id: candidate.id, start: now, duration });
        }
      }
      // If the first orange machine expired, switch to another immediately
      if (prev.length > 0 && now - prev[0].start >= prev[0].duration) {
        filtered = filtered.slice(1);
        let candidate = machines.find(m => m.status === 'warning' && !filtered.map(f => f.id).includes(m.id));
        if (!candidate) candidate = machines.find(m => m.status === 'normal' && !filtered.map(f => f.id).includes(m.id));
        if (!candidate) candidate = machines.find(m => m.status !== 'offline' && !filtered.map(f => f.id).includes(m.id));
        if (!candidate && machines.length > 0) candidate = machines.find(m => !filtered.map(f => f.id).includes(m.id));
        if (candidate) {
          const duration = 60000 + Math.floor(Math.random() * 60000);
          filtered.push({ id: candidate.id, start: now, duration });
        }
      }
      // Limit to 2 orange machines
      return filtered.slice(0, 2);
    });
  }, [machines]);

  // Only machines in redMachines can be red, only machines in orangeMachines can be orange
  const redIds = redMachines.map(rm => rm.id);
  const orangeIds = orangeMachines.map(om => om.id);
  const adjustedMachines = machines.map((m) => {
    if (redIds.includes(m.id)) {
      return { ...m, status: 'critical' as 'critical' };
    }
    if (orangeIds.includes(m.id)) {
      return { ...m, status: 'warning' as 'warning' };
    }
    // If not in either, never show as critical or warning
    return { ...m, status: 'normal' as 'normal' | 'offline' };
  });

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const toggleAutoRotate = () => {
    setIsAutoRotate(!isAutoRotate);
  };

  const handleExpandMap = () => {
    if (setIsMapExpanded) {
      setIsMapExpanded(!isMapExpanded);
    }
  };

  const handleToggleCeiling = () => {
    const next = !isCeilingVisible;
    setIsCeilingVisible(next);
    if (glbMapRef.current && glbMapRef.current.gltf && glbMapRef.current.gltf.scene) {
      const ceiling = glbMapRef.current.gltf.scene.getObjectByName('top');
      if (ceiling) ceiling.visible = next;
    }
  };

  return (
    <div ref={mapContainerRef} className="relative w-full h-full">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="outline" size="icon" onClick={resetCamera} className="glass-panel w-8 h-8">
          <RotateCcw className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="icon" onClick={toggleAutoRotate} className="glass-panel w-8 h-8">
          <Play className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleExpandMap} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10 glass-panel">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleToggleCeiling} className="glass-panel w-8 h-8">
          {/* Simple icon for ceiling toggle */}
          <span className="font-bold">☰</span>
        </Button>
      </div>
      <Canvas
        camera={{ position: [100, 150, 100], fov: 70, far: 10000 }}
        className="w-full h-full"
        style={{ background: '#f3f4f6' }}
        shadows
      >
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
        />
        <pointLight position={[0, 20, 0]} intensity={1.2} color="#fff" castShadow />
        <Suspense fallback={<Text position={[0, 2, 0]} fontSize={0.5} color="yellow">Loading map...</Text>}>
          <GLBMap ref={glbMapRef} machines={adjustedMachines} />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={isAutoRotate}
          autoRotateSpeed={0.5}
          minDistance={10}
          maxDistance={50000}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
          zoomSpeed={2.0}
          panSpeed={2.0}
          rotateSpeed={1.5}
        />
      </Canvas>
      <div className="absolute bottom-4 left-4 glass-panel p-3 rounded-lg">
        <h4 className="text-xs font-medium text-foreground mb-2">Status Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success"></div>
            <span className="text-xs text-muted-foreground">Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-warning"></div>
            <span className="text-xs text-muted-foreground">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-destructive"></div>
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
}
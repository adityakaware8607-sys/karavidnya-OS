import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { RobotData, LogEntry } from "../types";
import { RobotScene } from "./RobotArm";
import { 
  Activity, 
  Cpu, 
  Wifi, 
  AlertTriangle, 
  Terminal, 
  Settings, 
  Play, 
  Pause, 
  Clock,
  Gauge,
  Database,
  Sparkles,
  Loader2
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<RobotData>({
    base: 0, shoulder: 0, elbow: 0, wrist_pitch: 0, wrist_roll: 0, gripper: 0,
    timestamp: Date.now(), source: "simulator"
  });
  const [manualData, setManualData] = useState<RobotData>({
    base: 0, shoulder: 0, elbow: 0, wrist_pitch: 0, wrist_roll: 0, gripper: 0,
    timestamp: Date.now(), source: "manual"
  });
  const [history, setHistory] = useState<RobotData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [simulatorEnabled, setSimulatorEnabled] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);
  const [swarmCount, setSwarmCount] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const runAiDiagnostic = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          telemetry: { ...data, isConnected } 
        }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to run analysis");
      }
      
      const result = await response.json();
      setAiAnalysis(result.analysis);
    } catch (error: any) {
      console.error("AI Diagnostic failed:", error);
      setAiAnalysis(error.message || "Failed to connect to AI diagnostic service.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    socketRef.current = io();
    
    socketRef.current.on("connect", () => {
      setIsConnected(true);
      addLog("Connected to WebSocket Server", "success");
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
      addLog("Disconnected from WebSocket Server", "error");
    });

    socketRef.current.on("robot_data", (newData: RobotData) => {
      setData(newData);
      setHistory(prev => [...prev.slice(-50), newData]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [
      { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), message, type },
      ...prev.slice(0, 49)
    ]);
  };

  const [leftPanelTab, setLeftPanelTab] = useState<"manual" | "dynamics">("manual");

  const toggleSimulator = () => {
    const newState = !simulatorEnabled;
    setSimulatorEnabled(newState);
    if (newState) {
      setManualOverride(false);
      setLeftPanelTab("dynamics");
    }
    socketRef.current?.emit("toggle_simulator", newState);
    addLog(`Simulator ${newState ? "Enabled" : "Disabled"}`, "info");
  };

  const toggleManualOverride = () => {
    const newState = !manualOverride;
    setManualOverride(newState);
    if (newState) {
      setSimulatorEnabled(false);
      setLeftPanelTab("manual");
      socketRef.current?.emit("toggle_simulator", false);
      // Send current manual state immediately
      socketRef.current?.emit("manual_control", manualData);
    }
    addLog(`Manual Override ${newState ? "Activated" : "Deactivated"}`, newState ? "warning" : "info");
  };

  const handleManualChange = (joint: keyof RobotData, value: number) => {
    const newData = { ...manualData, [joint]: value, timestamp: Date.now() };
    setManualData(newData);
    if (manualOverride) {
      socketRef.current?.emit("manual_control", newData);
    }
  };

  const adjustSwarm = (delta: number) => {
    setSwarmCount(prev => Math.max(0, Math.min(9, prev + delta)));
    addLog(`Swarm size adjusted to ${Math.max(0, Math.min(9, swarmCount + delta))}`, "info");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Cpu className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">KARAVIDNYA <span className="text-emerald-600">OS</span></h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-mono">v2.4.0 // Swarm Control Active</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Swarm Controls */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mr-2">Swarm Replicas</span>
            <button onClick={() => adjustSwarm(-1)} className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-50 rounded border border-slate-200 text-xs text-slate-600">-</button>
            <span className="w-6 text-center font-mono text-sm font-bold text-blue-600">{swarmCount}</span>
            <button onClick={() => adjustSwarm(1)} className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-50 rounded border border-slate-200 text-xs text-slate-600">+</button>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2" />

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">System Status</span>
              <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500")} />
            </div>
            <span className="text-xs font-medium text-slate-600">{isConnected ? "ONLINE" : "OFFLINE"}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleManualOverride}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300",
                manualOverride 
                  ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                  : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Manual</span>
            </button>

            <button 
              onClick={toggleSimulator}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300",
                simulatorEnabled 
                  ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100" 
                  : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              )}
            >
              {simulatorEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-xs font-bold uppercase tracking-wider">Sim Mode</span>
            </button>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)]">
        {/* Left Panel: Telemetry & Manual Controls */}
        <section className="col-span-3 flex flex-col gap-6 overflow-hidden">
          {/* Joint Angles / Telemetry */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Gauge className="w-3 h-3" /> Telemetry
              </h2>
              <span className={cn("text-[10px] font-mono uppercase", 
                data.source === 'manual' ? 'text-red-500' : 
                data.source === 'mqtt' ? 'text-emerald-600' : 'text-amber-600'
              )}>
                {data.source}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Base", val: data.base, color: "text-emerald-600" },
                { label: "Shoulder", val: data.shoulder, color: "text-blue-600" },
                { label: "Elbow", val: data.elbow, color: "text-amber-600" },
                { label: "Wrist P", val: data.wrist_pitch, color: "text-purple-600" },
                { label: "Wrist R", val: data.wrist_roll, color: "text-pink-600" },
                { label: "Gripper", val: data.gripper, color: "text-slate-700" },
              ].map((joint) => (
                <div key={joint.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold mb-1">{joint.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-xl font-mono font-bold", joint.color)}>{joint.val.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-300">°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Control / Dynamics Tab Switcher */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex-1 flex flex-col gap-4 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex gap-4">
                <button 
                  onClick={() => setLeftPanelTab("manual")}
                  className={cn(
                    "text-xs font-bold uppercase tracking-widest transition-colors",
                    leftPanelTab === "manual" ? "text-emerald-600" : "text-slate-300 hover:text-slate-400"
                  )}
                >
                  Manual
                </button>
                <button 
                  onClick={() => setLeftPanelTab("dynamics")}
                  className={cn(
                    "text-xs font-bold uppercase tracking-widest transition-colors",
                    leftPanelTab === "dynamics" ? "text-emerald-600" : "text-slate-300 hover:text-slate-400"
                  )}
                >
                  Dynamics
                </button>
              </div>
              {manualOverride && leftPanelTab === "manual" && (
                <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">OVERRIDE ACTIVE</span>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden">
              {leftPanelTab === "manual" ? (
                <div className={cn(
                  "h-full overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200 transition-opacity duration-300",
                  !manualOverride && "opacity-50 pointer-events-none"
                )}>
                  {[
                    { id: "base", label: "Base Rotation", min: 0, max: 180 },
                    { id: "shoulder", label: "Shoulder Pitch", min: 0, max: 180 },
                    { id: "elbow", label: "Elbow Pitch", min: 0, max: 180 },
                    { id: "wrist_pitch", label: "Wrist Pitch", min: -90, max: 90 },
                    { id: "wrist_roll", label: "Wrist Roll", min: 0, max: 360 },
                    { id: "gripper", label: "Gripper", min: 0, max: 100 },
                  ].map((ctrl) => {
                    const val = manualData[ctrl.id as keyof RobotData];
                    const numVal = typeof val === "number" ? val : 0;
                    return (
                      <div key={ctrl.id} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                          <span className="text-slate-400">{ctrl.label}</span>
                          <span className="font-mono text-slate-700">{numVal.toFixed(0)}°</span>
                        </div>
                        <input 
                          type="range" 
                          min={ctrl.min} 
                          max={ctrl.max} 
                          step="1"
                          value={numVal}
                          onChange={(e) => handleManualChange(ctrl.id as keyof RobotData, parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                        />
                      </div>
                    );
                  })}
                  {!manualOverride && (
                    <div className="pt-4 text-center">
                      <p className="text-[10px] text-slate-300 italic">Enable Manual Override to control</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis domain={[0, 180]} hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '10px', color: '#334155' }}
                      />
                      <Area type="monotone" dataKey="base" stroke="#10b981" fillOpacity={1} fill="url(#colorBase)" isAnimationActive={false} />
                      <Line type="monotone" dataKey="shoulder" stroke="#3b82f6" dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="elbow" stroke="#f59e0b" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Center Panel: 3D Viewer */}
        <section className="col-span-6">
          <RobotScene data={data} swarmCount={swarmCount} />
        </section>

        {/* Right Panel: Status & Logs */}
        <section className="col-span-3 flex flex-col gap-6 overflow-hidden">
          {/* Swarm Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Settings className="w-3 h-3" /> Swarm Config
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Active Nodes</span>
                <span className="font-mono text-blue-600">{swarmCount + 1}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Sync Mode</span>
                <span className="font-mono text-emerald-600">MASTER-REPLICA</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Propagation</span>
                <span className="font-mono text-slate-600">Parallel</span>
              </div>
            </div>
          </div>

          {/* System Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex-1 flex flex-col gap-4 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Terminal className="w-3 h-3" /> System Logs
              </h2>
              <button onClick={() => setLogs([])} className="text-[10px] text-slate-300 hover:text-slate-500 uppercase font-bold">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 text-[10px] font-mono border-b border-slate-100 pb-2">
                  <span className="text-slate-300">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={cn(
                    log.type === 'error' ? 'text-red-500' : 
                    log.type === 'warning' ? 'text-amber-500' : 
                    log.type === 'success' ? 'text-emerald-600' : 'text-slate-600'
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-300 italic">
                  No active logs
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase text-red-600/80">Safety Protocol</h3>
              <p className="text-[10px] text-slate-500 leading-tight">Emergency stop active. Manual override required for hardware control.</p>
            </div>
          </div>

          {/* AI Diagnostics */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> AI Diagnostics
              </h2>
              <button 
                onClick={runAiDiagnostic}
                disabled={isAnalyzing}
                className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Run"}
              </button>
            </div>
            <div className="min-h-[60px] flex items-center justify-center">
              {aiAnalysis ? (
                <p className="text-[10px] text-slate-600 leading-relaxed italic">"{aiAnalysis}"</p>
              ) : (
                <p className="text-[10px] text-slate-300 italic">Click run for real-time AI system analysis</p>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-6 flex items-center justify-between px-4 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
        <div className="flex gap-6">
          <span>CPU: 12%</span>
          <span>RAM: 1.2GB</span>
          <span>GPU: 45%</span>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            <span>DB Sync: OK</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Uptime: 12:45:02</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;

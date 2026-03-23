export interface RobotData {
  base: number;
  shoulder: number;
  elbow: number;
  wrist_pitch: number;
  wrist_roll: number;
  gripper: number;
  timestamp: number;
  source: "mqtt" | "simulator" | "manual";
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "warning" | "error" | "success";
}

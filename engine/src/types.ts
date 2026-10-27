
export type Direction =
  | "NORTH"
  | "EAST"
  | "SOUTH"
  | "WEST";

export type RobotCommand =
  | "MOVE"
  | "LEFT"
  | "RIGHT";

export interface Position {
  x: number;
  y: number;
}

export interface GotoCommand {
  type: "GOTO";
  target: Position;
  blockedTicks: number;
}

export type QueuedCommand = RobotCommand | GotoCommand;

export interface Robot {
  id: string;
  position: Position;
  facing: Direction;
  queue: QueuedCommand[];
  battery: number;
}

export interface Floor {
  width: number;
  height: number;
  obstacles: Position[];
  chargers: Position[];
}

export type TickStatus =
  | "MOVED"
  | "TURNED"
  | "BLOCKED"
  | "IDLE"
  | "ARRIVED"
  | "UNREACHABLE";

export interface TickResult {
  robotId: string;
  command: QueuedCommand | null;
  status: TickStatus;
  reason?: string;
  from: Position;
  to: Position;
  facing: Direction;
}

export interface SimulationEvent {
  tick: number;
  type: string;
  robotId?: string;
  message: string;
}

export interface SimulationState {
  floor: Floor;
  robots: Robot[];
  tick: number;
  history: SimulationEvent[];
}

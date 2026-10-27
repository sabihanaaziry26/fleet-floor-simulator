
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

export interface SimulationEvent {
  tick: number;
  type: string;
  robotId?: string;
  message: string;
}

export interface SimulationState {
  floor: {
    width: number;
    height: number;
    obstacles: Position[];
    chargers: Position[];
  };
  robots: Robot[];
  tick: number;
  history: SimulationEvent[];
}

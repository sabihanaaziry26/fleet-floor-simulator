// Cardinal directions supported by the simulator.
export type Direction =
  | "NORTH"
  | "EAST"
  | "SOUTH"
  | "WEST";

// The three mandatory robot commands.
export type RobotCommand =
  | "MOVE"
  | "LEFT"
  | "RIGHT";

// A location on the warehouse floor.
export interface Position {
  x: number;
  y: number;
}

// A robot and its current state.
export interface Robot {
  id: string;
  position: Position;
  facing: Direction;
  queue: RobotCommand[];
}

// Dimensions of the warehouse floor.
export interface Floor {
  width: number;
  height: number;
  obstacles: Position[];
}

// Possible outcomes of one robot's tick.
export type TickStatus =
  | "MOVED"
  | "TURNED"
  | "BLOCKED"
  | "IDLE";

// Describes what happened to a robot during a tick.
export interface TickResult {
  robotId: string;
  command: RobotCommand | null;
  status: TickStatus;
  reason?: string;
  from: Position;
  to: Position;
  facing: Direction;
}

// One historical simulation event.
export interface SimulationEvent {
  tick: number;
  type: string;
  robotId?: string;
  message: string;
}

// The complete in-memory simulation state.
export interface SimulationState {
  floor: Floor;
  robots: Robot[];
  tick: number;
  history: SimulationEvent[];
}

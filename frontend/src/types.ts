export type Direction = "NORTH" | "EAST" | "SOUTH" | "WEST";

export interface Position {
  x: number;
  y: number;
}

export interface Robot {
  id: string;
  position: Position;
  facing: Direction;
  queue: string[];
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
  };
  robots: Robot[];
  tick: number;
  history: SimulationEvent[];
}
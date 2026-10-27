import type { SimulationState } from "./types.js";
import { createFloor } from "./floor.js";

export function createSimulation(
  width: number = 10,
  height: number = 8
): SimulationState {
  return {
    floor: createFloor(width, height),
    robots: [],
    tick: 0,
    history: []
  };
}
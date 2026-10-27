import type { SimulationState } from "./types.js";
import { createSimulation } from "./state.js";

/**
 * Creates a fresh simulation with the requested dimensions.
 *
 * Existing robots, obstacles, queues, and history are removed.
 */
export function resetSimulation(
  width: number = 10,
  height: number = 8
): SimulationState {
  return createSimulation(width, height);
}
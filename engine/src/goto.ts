
import type {
  GotoCommand,
  Position,
  SimulationState
} from "./types.js";

import { isInsideFloor } from "./floor.js";

/**
 * Appends a GOTO command to a robot's queue.
 *
 * Returns the original state without changes if:
 * - The robot does not exist.
 * - The destination is outside the floor.
 * - The destination contains an obstacle.
 */
export function queueGoto(
  state: SimulationState,
  robotId: string,
  target: Position
): SimulationState {
  const robot = state.robots.find(
    current => current.id === robotId
  );

  if (!robot || !isInsideFloor(state.floor, target)) {
    return state;
  }

  const isObstacle = state.floor.obstacles.some(
    obstacle =>
      obstacle.x === target.x &&
      obstacle.y === target.y
  );

  if (isObstacle) {
    return state;
  }

  const command: GotoCommand = {
    type: "GOTO",
    target: { ...target },
    blockedTicks: 0
  };

  return {
    ...state,
    robots: state.robots.map(current =>
      current.id === robotId
        ? {
            ...current,
            queue: [...current.queue, command]
          }
        : current
    ),
    history: [
      ...state.history,
      {
        tick: state.tick,
        type: "GOTO_QUEUED",
        robotId,
        message: `${robotId} queued GOTO ${target.x},${target.y}`
      }
    ]
  };
}

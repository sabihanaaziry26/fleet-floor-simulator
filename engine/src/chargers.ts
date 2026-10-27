
import type {
  Position,
  SimulationState
} from "./types.js";

import { isInsideFloor } from "./floor.js";

function samePosition(
  first: Position,
  second: Position
): boolean {
  return (
    first.x === second.x &&
    first.y === second.y
  );
}

/**
 * Adds a charger to an existing floor cell.
 *
 * Chargers can coexist with robots because robots
 * need to occupy charger cells to recharge.
 *
 * Returns the original state for invalid placements.
 */
export function addCharger(
  state: SimulationState,
  position: Position
): SimulationState {
  if (!isInsideFloor(state.floor, position)) {
    return state;
  }

  const hasObstacle = state.floor.obstacles.some(
    obstacle => samePosition(obstacle, position)
  );

  const hasCharger = state.floor.chargers.some(
    charger => samePosition(charger, position)
  );

  if (hasObstacle || hasCharger) {
    return state;
  }

  return {
    ...state,
    floor: {
      ...state.floor,
      chargers: [
        ...state.floor.chargers,
        { ...position }
      ]
    },
    history: [
      ...state.history,
      {
        tick: state.tick,
        type: "CHARGER_ADDED",
        message: `Charger added at ${position.x},${position.y}`
      }
    ]
  };
}

/**
 * Removes an existing charger.
 *
 * Returns the original state when no charger exists
 * at the supplied position.
 */
export function removeCharger(
  state: SimulationState,
  position: Position
): SimulationState {
  const exists = state.floor.chargers.some(
    charger => samePosition(charger, position)
  );

  if (!exists) {
    return state;
  }

  return {
    ...state,
    floor: {
      ...state.floor,
      chargers: state.floor.chargers.filter(
        charger => !samePosition(charger, position)
      )
    },
    history: [
      ...state.history,
      {
        tick: state.tick,
        type: "CHARGER_REMOVED",
        message: `Charger removed at ${position.x},${position.y}`
      }
    ]
  };
}

import type {
  Direction,
  Position,
  Robot,
  SimulationState
} from "./types.js";

import { isInsideFloor } from "./floor.js";

function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function isObstacle(
  state: SimulationState,
  position: Position
): boolean {
  return state.floor.obstacles.some(
    obstacle => samePosition(obstacle, position)
  );
}

function isOccupied(
  state: SimulationState,
  position: Position,
  excludeRobotId?: string
): boolean {
  return state.robots.some(
    robot =>
      robot.id !== excludeRobotId &&
      samePosition(robot.position, position)
  );
}

export function placeRobot(
  state: SimulationState,
  id: string,
  position: Position,
  facing: Direction = "NORTH"
): SimulationState {
  // Reject invalid IDs.
  if (!/^R[1-9]\d*$/.test(id)) {
    return state;
  }

  // Reject placements outside the floor.
  if (!isInsideFloor(state.floor, position)) {
    return state;
  }

  // Reject obstacles and other occupied cells.
  if (
    isObstacle(state, position) ||
    isOccupied(state, position, id)
  ) {
    return state;
  }

  const existingRobot = state.robots.find(
    robot => robot.id === id
  );

  let robots: Robot[];

  if (existingRobot) {
    // CLI PLACE allows relocating an existing robot.
    robots = state.robots.map(robot =>
      robot.id === id
        ? { ...robot, position: { ...position }, facing }
        : robot
    );
  } else {
    robots = [
      ...state.robots,
      {
        id,
        position: { ...position },
        facing,
        queue: []
      }
    ];
  }

  return {
    ...state,
    robots,
    history: [
      ...state.history,
      {
        tick: state.tick,
        type: "ROBOT_PLACED",
        robotId: id,
        message: `${id} placed at ${position.x},${position.y},${facing}`
      }
    ]
  };
}

export function addObstacle(
  state: SimulationState,
  position: Position
): SimulationState {
  if (!isInsideFloor(state.floor, position)) {
    return state;
  }

  if (
    isOccupied(state, position) ||
    isObstacle(state, position)
  ) {
    return state;
  }

  return {
    ...state,
    floor: {
      ...state.floor,
      obstacles: [
        ...state.floor.obstacles,
        { ...position }
      ]
    },
    history: [
      ...state.history,
      {
        tick: state.tick,
        type: "OBSTACLE_ADDED",
        message: `Obstacle added at ${position.x},${position.y}`
      }
    ]
  };
}

export function removeObstacle(
  state: SimulationState,
  position: Position
): SimulationState {
  if (!isObstacle(state, position)) {
    return state;
  }

  return {
    ...state,
    floor: {
      ...state.floor,
      obstacles: state.floor.obstacles.filter(
        obstacle => !samePosition(obstacle, position)
      )
    },
    history: [
      ...state.history,
      {
        tick: state.tick,
        type: "OBSTACLE_REMOVED",
        message: `Obstacle removed at ${position.x},${position.y}`
      }
    ]
  };
}
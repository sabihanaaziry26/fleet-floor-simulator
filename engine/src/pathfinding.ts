import type {
  Direction,
  Floor,
  Position
} from "./types.js";

import { isInsideFloor } from "./floor.js";

// Required tie-breaking order from the assessment.
const DIRECTIONS: {
  direction: Direction;
  dx: number;
  dy: number;
}[] = [
  { direction: "NORTH", dx: 0, dy: 1 },
  { direction: "EAST", dx: 1, dy: 0 },
  { direction: "SOUTH", dx: 0, dy: -1 },
  { direction: "WEST", dx: -1, dy: 0 }
];

function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}

/**
 * Finds the first direction on a shortest path to a target.
 *
 * Returns:
 * - A cardinal direction when a path exists.
 * - null if the target is unreachable, invalid, or already reached.
 *
 * Other robots are supplied as blockedPositions.
 */
export function findNextDirection(
  floor: Floor,
  start: Position,
  target: Position,
  blockedPositions: Position[] = []
): Direction | null {
  if (
    !isInsideFloor(floor, start) ||
    !isInsideFloor(floor, target)
  ) {
    return null;
  }

  if (start.x === target.x && start.y === target.y) {
    return null;
  }

  const blocked = new Set<string>();

  for (const obstacle of floor.obstacles) {
    blocked.add(positionKey(obstacle));
  }

  for (const position of blockedPositions) {
    blocked.add(positionKey(position));
  }

  // Never treat the pathfinding robot's own cell as blocked.
  blocked.delete(positionKey(start));

  if (blocked.has(positionKey(target))) {
    return null;
  }

  const visited = new Set<string>();
  visited.add(positionKey(start));

  const queue: {
    position: Position;
    firstDirection: Direction | null;
  }[] = [
    {
      position: start,
      firstDirection: null
    }
  ];

  // Index-based queue avoids expensive Array.shift() calls.
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head++;

    for (const step of DIRECTIONS) {
      const next: Position = {
        x: current.position.x + step.dx,
        y: current.position.y + step.dy
      };

      const key = positionKey(next);

      if (
        !isInsideFloor(floor, next) ||
        blocked.has(key) ||
        visited.has(key)
      ) {
        continue;
      }

      const firstDirection =
        current.firstDirection ?? step.direction;

      if (next.x === target.x && next.y === target.y) {
        return firstDirection;
      }

      visited.add(key);

      queue.push({
        position: next,
        firstDirection
      });
    }
  }

  return null;
}
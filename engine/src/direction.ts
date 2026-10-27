import type { Direction, Position } from "./types.js";

const DIRECTIONS: Direction[] = [
  "NORTH",
  "EAST",
  "SOUTH",
  "WEST"
];

export function turnLeft(
  facing: Direction
): Direction {
  const index = DIRECTIONS.indexOf(facing);

  return DIRECTIONS[
    (index + 3) % DIRECTIONS.length
  ];
}

export function turnRight(
  facing: Direction
): Direction {
  const index = DIRECTIONS.indexOf(facing);

  return DIRECTIONS[
    (index + 1) % DIRECTIONS.length
  ];
}

export function nextPosition(
  position: Position,
  facing: Direction
): Position {
  switch (facing) {
    case "NORTH":
      return { x: position.x, y: position.y + 1 };

    case "EAST":
      return { x: position.x + 1, y: position.y };

    case "SOUTH":
      return { x: position.x, y: position.y - 1 };

    case "WEST":
      return { x: position.x - 1, y: position.y };
  }
}
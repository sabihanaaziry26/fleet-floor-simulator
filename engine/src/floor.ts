import type { Floor, Position } from "./types.js";

const MIN_SIZE = 1;
const MAX_SIZE = 20;

export function createFloor(
  width: number = 10,
  height: number = 8
): Floor {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < MIN_SIZE ||
    width > MAX_SIZE ||
    height < MIN_SIZE ||
    height > MAX_SIZE
  ) {
    throw new Error("Floor dimensions must be integers between 1 and 20");
  }

  return {
    width,
    height,
    obstacles: []
  };
}

export function isInsideFloor(
  floor: Floor,
  position: Position
): boolean {
  return (
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.x < floor.width &&
    position.y >= 0 &&
    position.y < floor.height
  );
}
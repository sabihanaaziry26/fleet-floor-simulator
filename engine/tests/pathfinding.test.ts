import { describe, expect, it } from "vitest";

import { createFloor } from "../src/floor.js";
import { findNextDirection } from "../src/pathfinding.js";

describe("BFS pathfinding", () => {
  it("moves north toward a target directly above", () => {
    const floor = createFloor(5, 5);

    expect(
      findNextDirection(
        floor,
        { x: 1, y: 1 },
        { x: 1, y: 4 }
      )
    ).toBe("NORTH");
  });

  it("moves east toward a target directly right", () => {
    const floor = createFloor(5, 5);

    expect(
      findNextDirection(
        floor,
        { x: 0, y: 0 },
        { x: 3, y: 0 }
      )
    ).toBe("EAST");
  });

  it("prefers NORTH when shortest paths tie", () => {
    const floor = createFloor(5, 5);

    expect(
      findNextDirection(
        floor,
        { x: 1, y: 1 },
        { x: 2, y: 2 }
      )
    ).toBe("NORTH");
  });

  it("navigates around an obstacle", () => {
    const floor = createFloor(5, 5);

    floor.obstacles.push({ x: 1, y: 2 });

    expect(
      findNextDirection(
        floor,
        { x: 1, y: 1 },
        { x: 1, y: 3 }
      )
    ).toBe("EAST");
  });

  it("avoids cells occupied by other robots", () => {
    const floor = createFloor(5, 5);

    expect(
      findNextDirection(
        floor,
        { x: 1, y: 1 },
        { x: 1, y: 3 },
        [{ x: 1, y: 2 }]
      )
    ).toBe("EAST");
  });

  it("returns null when the target is blocked", () => {
    const floor = createFloor(5, 5);

    floor.obstacles.push({ x: 2, y: 2 });

    expect(
      findNextDirection(
        floor,
        { x: 0, y: 0 },
        { x: 2, y: 2 }
      )
    ).toBeNull();
  });

  it("returns null when no route exists", () => {
    const floor = createFloor(3, 3);

    floor.obstacles.push(
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    );

    expect(
      findNextDirection(
        floor,
        { x: 0, y: 0 },
        { x: 2, y: 2 }
      )
    ).toBeNull();
  });

  it("returns null when already at the destination", () => {
    const floor = createFloor(5, 5);

    expect(
      findNextDirection(
        floor,
        { x: 2, y: 2 },
        { x: 2, y: 2 }
      )
    ).toBeNull();
  });

  it("rejects destinations outside the floor", () => {
    const floor = createFloor(5, 5);

    expect(
      findNextDirection(
        floor,
        { x: 0, y: 0 },
        { x: 8, y: 8 }
      )
    ).toBeNull();
  });

  it("does not modify the original floor", () => {
    const floor = createFloor(5, 5);
    floor.obstacles.push({ x: 2, y: 2 });

    const originalObstacles = structuredClone(
      floor.obstacles
    );

    findNextDirection(
      floor,
      { x: 0, y: 0 },
      { x: 4, y: 4 }
    );

    expect(floor.obstacles).toEqual(originalObstacles);
  });
});
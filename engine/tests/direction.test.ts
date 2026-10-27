import { describe, expect, it } from "vitest";

import {
  turnLeft,
  turnRight,
  nextPosition
} from "../src/direction.js";

describe("Robot turning", () => {
  it("turns right from north to east", () => {
    expect(turnRight("NORTH")).toBe("EAST");
  });

  it("turns left from north to west", () => {
    expect(turnLeft("NORTH")).toBe("WEST");
  });

  it("turns right through all four directions", () => {
    expect(turnRight("EAST")).toBe("SOUTH");
    expect(turnRight("SOUTH")).toBe("WEST");
    expect(turnRight("WEST")).toBe("NORTH");
  });

  it("turns left through all four directions", () => {
    expect(turnLeft("WEST")).toBe("SOUTH");
    expect(turnLeft("SOUTH")).toBe("EAST");
    expect(turnLeft("EAST")).toBe("NORTH");
  });

  it("returns to north after four right turns", () => {
    let facing = "NORTH" as const;

    const first = turnRight(facing);
    const second = turnRight(first);
    const third = turnRight(second);
    const fourth = turnRight(third);

    expect(fourth).toBe("NORTH");
  });
});

describe("Next position calculations", () => {
  const start = { x: 2, y: 2 };

  it("calculates movement north", () => {
    expect(nextPosition(start, "NORTH")).toEqual({
      x: 2,
      y: 3
    });
  });

  it("calculates movement east", () => {
    expect(nextPosition(start, "EAST")).toEqual({
      x: 3,
      y: 2
    });
  });

  it("calculates movement south", () => {
    expect(nextPosition(start, "SOUTH")).toEqual({
      x: 2,
      y: 1
    });
  });

  it("calculates movement west", () => {
    expect(nextPosition(start, "WEST")).toEqual({
      x: 1,
      y: 2
    });
  });

  it("does not mutate the original position", () => {
    nextPosition(start, "EAST");

    expect(start).toEqual({ x: 2, y: 2 });
  });
});
import { describe, expect, it } from "vitest";

import { resetSimulation } from "../src/reset.js";
import { createSimulation } from "../src/state.js";
import { placeRobot, addObstacle } from "../src/placement.js";

describe("Simulation reset", () => {
  it("creates the default 10x8 floor", () => {
    const state = resetSimulation();

    expect(state.floor.width).toBe(10);
    expect(state.floor.height).toBe(8);
    expect(state.robots).toEqual([]);
    expect(state.tick).toBe(0);
    expect(state.history).toEqual([]);
  });

  it("supports custom floor dimensions", () => {
    const state = resetSimulation(5, 5);

    expect(state.floor.width).toBe(5);
    expect(state.floor.height).toBe(5);
  });

  it("rejects invalid dimensions", () => {
    expect(() => resetSimulation(0, 5)).toThrow();
    expect(() => resetSimulation(21, 5)).toThrow();
  });

  it("creates a clean simulation without changing the previous state", () => {
    let original = createSimulation(5, 5);

    original = placeRobot(
      original,
      "R1",
      { x: 0, y: 0 },
      "EAST"
    );

    original = addObstacle(original, {
      x: 2,
      y: 2
    });

    const reset = resetSimulation(5, 5);

    expect(reset.robots).toEqual([]);
    expect(reset.floor.obstacles).toEqual([]);
    expect(reset.history).toEqual([]);

    expect(original.robots).toHaveLength(1);
    expect(original.floor.obstacles).toHaveLength(1);
  });
});
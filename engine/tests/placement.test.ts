import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import {
  placeRobot,
  addObstacle,
  removeObstacle
} from "../src/placement.js";

describe("Robot placement", () => {
  it("places a robot facing north by default", () => {
    const state = createSimulation(5, 5);

    const result = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 }
    );

    expect(result.robots).toHaveLength(1);
    expect(result.robots[0].facing).toBe("NORTH");
    expect(result.robots[0].position).toEqual({
      x: 0,
      y: 0
    });
  });

  it("rejects placement outside the floor", () => {
    const state = createSimulation(5, 5);

    const result = placeRobot(
      state,
      "R1",
      { x: 5, y: 0 }
    );

    expect(result).toBe(state);
  });

  it("rejects placing two robots on the same cell", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(state, "R1", { x: 1, y: 1 });

    const result = placeRobot(
      state,
      "R2",
      { x: 1, y: 1 }
    );

    expect(result.robots).toHaveLength(1);
  });

  it("allows relocating an existing robot", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(state, "R1", { x: 0, y: 0 });

    state = placeRobot(
      state,
      "R1",
      { x: 2, y: 2 },
      "EAST"
    );

    expect(state.robots).toHaveLength(1);
    expect(state.robots[0].position).toEqual({
      x: 2,
      y: 2
    });
    expect(state.robots[0].facing).toBe("EAST");
  });

  it("does not mutate the original state", () => {
    const original = createSimulation(5, 5);

    const updated = placeRobot(
      original,
      "R1",
      { x: 0, y: 0 }
    );

    expect(original.robots).toHaveLength(0);
    expect(updated.robots).toHaveLength(1);
  });
});

describe("Obstacle management", () => {
  it("adds an obstacle to an empty cell", () => {
    const state = createSimulation(5, 5);

    const result = addObstacle(state, {
      x: 2,
      y: 2
    });

    expect(result.floor.obstacles).toEqual([
      { x: 2, y: 2 }
    ]);
  });

  it("rejects an obstacle on a robot", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(state, "R1", {
      x: 1,
      y: 1
    });

    const result = addObstacle(state, {
      x: 1,
      y: 1
    });

    expect(result).toBe(state);
  });

  it("rejects placing a robot on an obstacle", () => {
    let state = createSimulation(5, 5);

    state = addObstacle(state, { x: 2, y: 2 });

    const result = placeRobot(
      state,
      "R1",
      { x: 2, y: 2 }
    );

    expect(result.robots).toHaveLength(0);
  });

  it("prevents duplicate obstacles", () => {
    let state = createSimulation(5, 5);

    state = addObstacle(state, { x: 2, y: 2 });

    const result = addObstacle(state, {
      x: 2,
      y: 2
    });

    expect(result.floor.obstacles).toHaveLength(1);
  });

  it("removes an existing obstacle", () => {
    let state = createSimulation(5, 5);

    state = addObstacle(state, { x: 2, y: 2 });

    state = removeObstacle(state, {
      x: 2,
      y: 2
    });

    expect(state.floor.obstacles).toHaveLength(0);
  });

  it("records successful changes in history", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(state, "R1", {
      x: 0,
      y: 0
    });

    state = addObstacle(state, {
      x: 2,
      y: 2
    });

    expect(state.history).toHaveLength(2);
    expect(state.history[0].type).toBe(
      "ROBOT_PLACED"
    );
    expect(state.history[1].type).toBe(
      "OBSTACLE_ADDED"
    );
  });
});
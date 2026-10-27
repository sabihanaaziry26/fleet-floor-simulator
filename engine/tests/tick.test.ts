import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot, addObstacle } from "../src/placement.js";
import { queueCommands } from "../src/commands.js";
import { executeTick } from "../src/tick.js";

describe("Tick execution - turning and queues", () => {
  it("advances the tick counter", () => {
    const state = createSimulation(5, 5);

    const result = executeTick(state);

    expect(result.state.tick).toBe(1);
    expect(state.tick).toBe(0);
  });

  it("turns a robot left and consumes one command", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "NORTH"
    );

    state = queueCommands(
      state,
      "R1",
      ["LEFT", "RIGHT"]
    );

    const result = executeTick(state);

    expect(result.state.robots[0].facing).toBe("WEST");
    expect(result.state.robots[0].queue).toEqual([
      "RIGHT"
    ]);
    expect(result.results[0].status).toBe("TURNED");
  });

  it("turns a robot right without moving its position", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 2, y: 2 },
      "NORTH"
    );

    state = queueCommands(state, "R1", ["RIGHT"]);

    const result = executeTick(state);

    expect(result.state.robots[0].facing).toBe("EAST");
    expect(result.state.robots[0].position).toEqual({
      x: 2,
      y: 2
    });
  });

  it("executes one command per robot simultaneously", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "NORTH"
    );

    state = placeRobot(
      state,
      "R2",
      { x: 2, y: 2 },
      "SOUTH"
    );

    state = queueCommands(state, "R1", ["RIGHT"]);
    state = queueCommands(state, "R2", ["LEFT"]);

    const result = executeTick(state);

    expect(result.state.robots[0].facing).toBe("EAST");
    expect(result.state.robots[1].facing).toBe("EAST");
    expect(result.results).toHaveLength(2);
  });

  it("records an idle result for a robot without commands", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 }
    );

    const result = executeTick(state);

    expect(result.results[0].status).toBe("IDLE");
    expect(result.results[0].command).toBeNull();
  });

  it("records tick results in history", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 }
    );

    state = queueCommands(state, "R1", ["RIGHT"]);

    const result = executeTick(state);

    expect(
      result.state.history.at(-1)?.type
    ).toBe("TICK_RESULT");
  });

  it("does not mutate the original state", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 }
    );

    state = queueCommands(state, "R1", ["RIGHT"]);

    const result = executeTick(state);

    expect(state.tick).toBe(0);
    expect(state.robots[0].facing).toBe("NORTH");
    expect(result.state.robots[0].facing).toBe("EAST");
  });

  it("moves a robot into an empty cell", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "EAST"
    );

    state = queueCommands(state, "R1", ["MOVE"]);

    const result = executeTick(state);

    expect(result.state.robots[0].position).toEqual({
      x: 1,
      y: 0
    });

    expect(result.results[0].status).toBe("MOVED");
    expect(result.state.robots[0].queue).toEqual([]);
  });

  it("blocks movement outside the floor", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 4, y: 0 },
      "EAST"
    );

    state = queueCommands(state, "R1", ["MOVE"]);

    const result = executeTick(state);

    expect(result.state.robots[0].position).toEqual({
      x: 4,
      y: 0
    });

    expect(result.results[0].status).toBe("BLOCKED");
    expect(result.results[0].reason).toBe("WALL");
    expect(result.state.robots[0].queue).toEqual([]);
  });

  it("blocks movement into an obstacle", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "EAST"
    );

    state = addObstacle(state, { x: 1, y: 0 });
    state = queueCommands(state, "R1", ["MOVE"]);

    const result = executeTick(state);

    expect(result.state.robots[0].position).toEqual({
      x: 0,
      y: 0
    });

    expect(result.results[0].status).toBe("BLOCKED");
    expect(result.results[0].reason).toBe("OBSTACLE");
    expect(result.state.robots[0].queue).toEqual([]);
  });

  it("does not mutate the original position after moving", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "EAST"
    );

    state = queueCommands(state, "R1", ["MOVE"]);

    const result = executeTick(state);

    expect(state.robots[0].position).toEqual({
      x: 0,
      y: 0
    });

    expect(result.state.robots[0].position).toEqual({
      x: 1,
      y: 0
    });
  });
});
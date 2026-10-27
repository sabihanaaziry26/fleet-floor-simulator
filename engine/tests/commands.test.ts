import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot } from "../src/placement.js";
import { queueCommands } from "../src/commands.js";

function setupRobot() {
  const state = createSimulation(5, 5);

  return placeRobot(
    state,
    "R1",
    { x: 0, y: 0 },
    "EAST"
  );
}

describe("Robot command queues", () => {
  it("queues commands in the correct order", () => {
    const state = setupRobot();

    const result = queueCommands(
      state,
      "R1",
      ["MOVE", "LEFT", "MOVE"]
    );

    expect(result.robots[0].queue).toEqual([
      "MOVE",
      "LEFT",
      "MOVE"
    ]);
  });

  it("appends commands to an existing queue", () => {
    let state = setupRobot();

    state = queueCommands(state, "R1", ["MOVE"]);
    state = queueCommands(state, "R1", ["RIGHT"]);

    expect(state.robots[0].queue).toEqual([
      "MOVE",
      "RIGHT"
    ]);
  });

  it("accepts lowercase commands", () => {
    const state = setupRobot();

    const result = queueCommands(
      state,
      "R1",
      ["move", "left"]
    );

    expect(result.robots[0].queue).toEqual([
      "MOVE",
      "LEFT"
    ]);
  });

  it("ignores commands for unknown robots", () => {
    const state = setupRobot();

    const result = queueCommands(
      state,
      "R99",
      ["MOVE"]
    );

    expect(result).toBe(state);
  });

  it("rejects an invalid command", () => {
    const state = setupRobot();

    const result = queueCommands(
      state,
      "R1",
      ["MOVE", "JUMP"]
    );

    expect(result).toBe(state);
  });

  it("does not mutate the original queue", () => {
    const original = setupRobot();

    const updated = queueCommands(
      original,
      "R1",
      ["MOVE"]
    );

    expect(original.robots[0].queue).toEqual([]);
    expect(updated.robots[0].queue).toEqual([
      "MOVE"
    ]);
  });

  it("records command queue changes in history", () => {
    const state = setupRobot();

    const updated = queueCommands(
      state,
      "R1",
      ["MOVE"]
    );

    expect(
      updated.history.at(-1)?.type
    ).toBe("COMMANDS_QUEUED");

    expect(
      updated.history.at(-1)?.robotId
    ).toBe("R1");
  });
});
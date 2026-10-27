
import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot, addObstacle } from "../src/placement.js";
import { queueGoto } from "../src/goto.js";

describe("GOTO command queueing", () => {
  it("queues a valid GOTO destination", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "NORTH"
    );

    const updated = queueGoto(
      state,
      "R1",
      { x: 4, y: 3 }
    );

    expect(updated.robots[0].queue).toEqual([
      {
        type: "GOTO",
        target: { x: 4, y: 3 },
        blockedTicks: 0
      }
    ]);

    expect(updated.robots[0].position).toEqual({
      x: 0,
      y: 0
    });
  });

  it("appends GOTO after existing basic commands", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "EAST"
    );

    state = {
      ...state,
      robots: state.robots.map(robot => ({
        ...robot,
        queue: ["MOVE" as const]
      }))
    };

    const updated = queueGoto(
      state,
      "R1",
      { x: 3, y: 3 }
    );

    expect(updated.robots[0].queue).toEqual([
      "MOVE",
      {
        type: "GOTO",
        target: { x: 3, y: 3 },
        blockedTicks: 0
      }
    ]);
  });

  it("rejects a destination outside the floor", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "NORTH"
    );

    const updated = queueGoto(
      state,
      "R1",
      { x: 9, y: 9 }
    );

    expect(updated).toBe(state);
  });

  it("rejects an obstacle destination", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "NORTH"
    );

    state = addObstacle(state, {
      x: 3,
      y: 3
    });

    const updated = queueGoto(
      state,
      "R1",
      { x: 3, y: 3 }
    );

    expect(updated).toBe(state);
  });

  it("rejects an unknown robot", () => {
    const state = createSimulation(5, 5);

    expect(
      queueGoto(
        state,
        "R99",
        { x: 2, y: 2 }
      )
    ).toBe(state);
  });

  it("records the GOTO queue event in history", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "NORTH"
    );

    const updated = queueGoto(
      state,
      "R1",
      { x: 4, y: 4 }
    );

    expect(updated.history.at(-1)?.type).toBe(
      "GOTO_QUEUED"
    );

    expect(updated.history.at(-1)?.robotId).toBe(
      "R1"
    );
  });
});

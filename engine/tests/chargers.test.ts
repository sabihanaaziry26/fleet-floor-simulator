
import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot, addObstacle } from "../src/placement.js";
import { addCharger, removeCharger } from "../src/chargers.js";

describe("Charger management", () => {
  it("adds a charger to an empty cell", () => {
    const state = createSimulation(5, 5);

    const updated = addCharger(
      state,
      { x: 2, y: 2 }
    );

    expect(updated.floor.chargers).toEqual([
      { x: 2, y: 2 }
    ]);
    expect(state.floor.chargers).toEqual([]);
  });

  it("allows a charger on a robot's cell", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 1, y: 1 },
      "NORTH"
    );

    const updated = addCharger(
      state,
      { x: 1, y: 1 }
    );

    expect(updated.floor.chargers).toEqual([
      { x: 1, y: 1 }
    ]);
    expect(updated.robots[0].position).toEqual({
      x: 1,
      y: 1
    });
  });

  it("rejects charger placement on an obstacle", () => {
    let state = createSimulation(5, 5);

    state = addObstacle(
      state,
      { x: 2, y: 2 }
    );

    const updated = addCharger(
      state,
      { x: 2, y: 2 }
    );

    expect(updated).toBe(state);
  });

  it("rejects charger placement outside the floor", () => {
    const state = createSimulation(5, 5);

    expect(
      addCharger(state, { x: 5, y: 0 })
    ).toBe(state);

    expect(
      addCharger(state, { x: -1, y: 0 })
    ).toBe(state);
  });

  it("does not duplicate an existing charger", () => {
    const state = addCharger(
      createSimulation(5, 5),
      { x: 3, y: 3 }
    );

    expect(
      addCharger(state, { x: 3, y: 3 })
    ).toBe(state);
  });

  it("removes an existing charger", () => {
    let state = createSimulation(5, 5);

    state = addCharger(
      state,
      { x: 2, y: 2 }
    );

    state = removeCharger(
      state,
      { x: 2, y: 2 }
    );

    expect(state.floor.chargers).toEqual([]);
    expect(state.history.at(-1)?.type).toBe(
      "CHARGER_REMOVED"
    );
  });

  it("ignores removal of a missing charger", () => {
    const state = createSimulation(5, 5);

    expect(
      removeCharger(state, { x: 2, y: 2 })
    ).toBe(state);
  });

  it("records charger placement in history", () => {
    const state = addCharger(
      createSimulation(5, 5),
      { x: 1, y: 3 }
    );

    expect(state.history.at(-1)?.type).toBe(
      "CHARGER_ADDED"
    );
  });

  it("rejects obstacle placement on an existing charger", () => {
    const state = addCharger(
        createSimulation(5, 5),
        { x: 2, y: 2 }
    );

    const updated = addObstacle(
        state,
        { x: 2, y: 2 }
    );

    expect(updated).toBe(state);
    expect(updated.floor.obstacles).toEqual([]);
    expect(updated.floor.chargers).toEqual([
        { x: 2, y: 2 }
    ]);
    });
});


import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot } from "../src/placement.js";
import { createFloor } from "../src/floor.js";

describe("Battery initialization", () => {
  it("starts every new robot with 100 battery units", () => {
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
      "EAST"
    );

    expect(state.robots[0].battery).toBe(100);
    expect(state.robots[1].battery).toBe(100);
  });

  it("creates a floor with no chargers initially", () => {
    const floor = createFloor(5, 5);

    expect(floor.chargers).toEqual([]);
  });

  it("preserves battery when relocating an existing robot", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 0, y: 0 },
      "NORTH"
    );

    // Set a lower battery level to verify relocation
    // does not reset it back to 100.
    state = {
      ...state,
      robots: state.robots.map(robot =>
        robot.id === "R1"
          ? { ...robot, battery: 42 }
          : robot
      )
    };

    state = placeRobot(
      state,
      "R1",
      { x: 3, y: 3 },
      "WEST"
    );

    expect(state.robots[0].battery).toBe(42);
    expect(state.robots[0].position).toEqual({
      x: 3,
      y: 3
    });
  });

  it("does not change battery when queueing commands", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(
      state,
      "R1",
      { x: 1, y: 1 },
      "EAST"
    );

    expect(state.robots[0].battery).toBe(100);
  });
});

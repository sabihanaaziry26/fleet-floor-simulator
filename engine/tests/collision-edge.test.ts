import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot, addObstacle } from "../src/placement.js";
import { queueCommands } from "../src/commands.js";
import { executeTick } from "../src/tick.js";

describe("Advanced collision edge cases", () => {
  it("blocks an entire chain when the last robot hits a wall", () => {
    let state = createSimulation(4, 1);

    for (let i = 0; i < 4; i++) {
      state = placeRobot(
        state,
        `R${i + 1}`,
        { x: i, y: 0 },
        "EAST"
      );

      state = queueCommands(state, `R${i + 1}`, ["MOVE"]);
    }

    const result = executeTick(state);

    expect(
      result.state.robots.map(robot => robot.position.x)
    ).toEqual([0, 1, 2, 3]);

    expect(
      result.results.every(r => r.status === "BLOCKED")
    ).toBe(true);

    expect(
      result.state.robots.every(r => r.queue.length === 0)
    ).toBe(true);
  });

  it("blocks a robot following a head-on swap", () => {
    let state = createSimulation(5, 1);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = placeRobot(state, "R2", { x: 1, y: 0 }, "EAST");
    state = placeRobot(state, "R3", { x: 2, y: 0 }, "WEST");

    for (const id of ["R1", "R2", "R3"]) {
      state = queueCommands(state, id, ["MOVE"]);
    }

    const result = executeTick(state);

    expect(
      result.state.robots.map(robot => robot.position.x)
    ).toEqual([0, 1, 2]);

    expect(
      result.results.every(r => r.status === "BLOCKED")
    ).toBe(true);
  });

  it("does not let a robot follow a contested loser", () => {
    let state = createSimulation(5, 3);

    state = placeRobot(state, "R1", { x: 0, y: 1 }, "EAST");
    state = placeRobot(state, "R2", { x: 2, y: 1 }, "WEST");
    state = placeRobot(state, "R3", { x: 3, y: 1 }, "WEST");

    for (const id of ["R1", "R2", "R3"]) {
      state = queueCommands(state, id, ["MOVE"]);
    }

    const result = executeTick(state);

    expect(
      result.state.robots.map(robot => robot.position.x)
    ).toEqual([1, 2, 3]);

    expect(
      result.results.find(r => r.robotId === "R3")?.reason
    ).toBe("BLOCKED_BY_ROBOT");
  });

  it("blocks a robot that attempts to enter an obstacle", () => {
    let state = createSimulation(3, 3);

    state = placeRobot(state, "R1", { x: 1, y: 1 }, "NORTH");
    state = addObstacle(state, { x: 1, y: 2 });
    state = queueCommands(state, "R1", ["MOVE"]);

    const result = executeTick(state);

    expect(result.results[0].status).toBe("BLOCKED");
    expect(result.results[0].reason).toBe("OBSTACLE");
  });
});
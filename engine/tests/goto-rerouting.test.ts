import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot, addObstacle } from "../src/placement.js";
import { queueGoto } from "../src/goto.js";
import { queueCommands } from "../src/commands.js";
import { executeTick } from "../src/tick.js";

describe("GOTO dynamic rerouting", () => {
  it("continues navigating after a blocking robot moves away", () => {
    let state = createSimulation(3, 2);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = placeRobot(state, "R2", { x: 1, y: 0 }, "NORTH");

    // R1 cannot move north, so R2 blocks its only route.
    state = addObstacle(state, { x: 0, y: 1 });

    state = queueGoto(state, "R1", { x: 2, y: 0 });

    // R2 moves north during the first tick.
    state = queueCommands(state, "R2", ["MOVE"]);

    const first = executeTick(state);

    expect(
      first.results.find(result => result.robotId === "R1")?.reason
    ).toBe("NO_PATH");

    expect(
      first.state.robots.find(robot => robot.id === "R2")?.position
    ).toEqual({ x: 1, y: 1 });

    expect(
      first.state.robots.find(robot => robot.id === "R1")?.queue[0]
    ).toMatchObject({
      type: "GOTO",
      blockedTicks: 1
    });

    // On the next tick, R2 is no longer blocking the route.
    const second = executeTick(first.state);

    expect(
      second.state.robots.find(robot => robot.id === "R1")?.position
    ).toEqual({ x: 1, y: 0 });

    expect(
      second.results.find(result => result.robotId === "R1")?.status
    ).toBe("MOVED");

    // R1 should reach the destination on the third tick.
    const third = executeTick(second.state);

    expect(
      third.state.robots.find(robot => robot.id === "R1")?.position
    ).toEqual({ x: 2, y: 0 });

    expect(
      third.results.find(result => result.robotId === "R1")?.status
    ).toBe("ARRIVED");

    expect(
      third.state.robots.find(robot => robot.id === "R1")?.queue
    ).toEqual([]);
  });

  it("does not allow GOTO to move onto another robot", () => {
    let state = createSimulation(3, 1);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = placeRobot(state, "R2", { x: 1, y: 0 }, "EAST");

    state = queueGoto(state, "R1", { x: 2, y: 0 });

    const result = executeTick(state);

    expect(
      result.state.robots.find(robot => robot.id === "R1")?.position
    ).toEqual({ x: 0, y: 0 });

    expect(
      result.results.find(result => result.robotId === "R1")?.reason
    ).toBe("NO_PATH");
  });

  it("keeps ordinary MOVE commands working alongside GOTO", () => {
    let state = createSimulation(5, 3);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = placeRobot(state, "R2", { x: 4, y: 2 }, "WEST");

    state = queueGoto(state, "R1", { x: 2, y: 0 });
    state = queueCommands(state, "R2", ["MOVE"]);

    const result = executeTick(state);

    expect(
      result.state.robots.find(robot => robot.id === "R1")?.position
    ).toEqual({ x: 1, y: 0 });

    expect(
      result.state.robots.find(robot => robot.id === "R2")?.position
    ).toEqual({ x: 3, y: 2 });

    expect(
      result.results.every(result => result.status === "MOVED")
    ).toBe(true);
  });
});
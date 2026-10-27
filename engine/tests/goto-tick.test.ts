import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot, addObstacle } from "../src/placement.js";
import { queueGoto } from "../src/goto.js";
import { queueCommands } from "../src/commands.js";
import { executeTick } from "../src/tick.js";

describe("GOTO tick execution", () => {
  it("moves north first when shortest paths tie", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = queueGoto(state, "R1", { x: 2, y: 2 });

    const result = executeTick(state);
    const robot = result.state.robots[0];

    expect(robot.position).toEqual({ x: 0, y: 1 });
    expect(robot.facing).toBe("NORTH");
    expect(result.results[0].status).toBe("MOVED");
    expect(robot.queue).toHaveLength(1);
  });

  it("reaches a destination and removes GOTO", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = queueGoto(state, "R1", { x: 2, y: 0 });

    const first = executeTick(state);

    expect(first.state.robots[0].position).toEqual({
      x: 1,
      y: 0
    });

    expect(first.state.robots[0].queue).toHaveLength(1);

    const second = executeTick(first.state);

    expect(second.state.robots[0].position).toEqual({
      x: 2,
      y: 0
    });

    expect(second.results[0].status).toBe("ARRIVED");
    expect(second.state.robots[0].queue).toEqual([]);
  });

  it("completes GOTO immediately when already at target", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(state, "R1", { x: 2, y: 2 }, "WEST");
    state = queueGoto(state, "R1", { x: 2, y: 2 });

    const result = executeTick(state);

    expect(result.results[0].status).toBe("ARRIVED");
    expect(result.state.robots[0].position).toEqual({
      x: 2,
      y: 2
    });
    expect(result.state.robots[0].queue).toEqual([]);
  });

  it("navigates around an obstacle", () => {
    let state = createSimulation(5, 5);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "NORTH");
    state = addObstacle(state, { x: 0, y: 1 });
    state = queueGoto(state, "R1", { x: 0, y: 2 });

    const result = executeTick(state);

    expect(result.state.robots[0].position).toEqual({
      x: 1,
      y: 0
    });

    expect(result.state.robots[0].facing).toBe("EAST");
  });

  it("marks GOTO unreachable after three no-path ticks", () => {
    let state = createSimulation(3, 3);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "NORTH");
    state = addObstacle(state, { x: 1, y: 0 });
    state = addObstacle(state, { x: 0, y: 1 });
    state = queueGoto(state, "R1", { x: 2, y: 2 });

    const first = executeTick(state);

    expect(first.results[0].status).toBe("BLOCKED");
    expect(first.results[0].reason).toBe("NO_PATH");
    expect(first.state.robots[0].queue[0]).toMatchObject({
      type: "GOTO",
      blockedTicks: 1
    });

    const second = executeTick(first.state);

    expect(second.results[0].status).toBe("BLOCKED");
    expect(second.state.robots[0].queue[0]).toMatchObject({
      type: "GOTO",
      blockedTicks: 2
    });

    const third = executeTick(second.state);

    expect(third.results[0].status).toBe("UNREACHABLE");
    expect(third.results[0].reason).toBe("NO_PATH");
    expect(third.state.robots[0].queue).toEqual([]);
  });

  it("recalculates the path when another robot moves away", () => {
    let state = createSimulation(3, 2);

    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = placeRobot(state, "R2", { x: 1, y: 0 }, "EAST");

    state = addObstacle(state, { x: 0, y: 1 });
    state = addObstacle(state, { x: 1, y: 1 });
    state = addObstacle(state, { x: 2, y: 1 });

    state = queueGoto(state, "R1", { x: 2, y: 0 });
    state = queueCommands(state, "R2", ["MOVE"]);

    const first = executeTick(state);

    expect(first.results.find(r => r.robotId === "R1")?.reason)
      .toBe("NO_PATH");

    expect(first.state.robots.find(r => r.id === "R2")?.position)
      .toEqual({ x: 2, y: 0 });

    const second = executeTick(first.state);

    // R2 now occupies the destination, so R1 must
    // continue waiting rather than entering that cell.
    expect(second.results.find(r => r.robotId === "R1")?.reason)
      .toBe("NO_PATH");
  });
});
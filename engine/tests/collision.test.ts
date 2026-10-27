import { describe, expect, it } from "vitest";

import type {
  Direction,
  SimulationState
} from "../src/types.js";

import { createSimulation } from "../src/state.js";
import { placeRobot, addObstacle } from "../src/placement.js";
import { queueCommands } from "../src/commands.js";
import { executeTick } from "../src/tick.js";

// Helper to reduce repeated setup code.
function robot(
  state: SimulationState,
  id: string,
  x: number,
  y: number,
  facing: Direction
): SimulationState {
  return placeRobot(state, id, { x, y }, facing);
}

function move(
  state: SimulationState,
  ...ids: string[]
): SimulationState {
  let updated = state;

  for (const id of ids) {
    updated = queueCommands(updated, id, ["MOVE"]);
  }

  return updated;
}

function positions(state: SimulationState) {
  return Object.fromEntries(
    state.robots.map(robot => [
      robot.id,
      {
        x: robot.position.x,
        y: robot.position.y
      }
    ])
  );
}

describe("Simultaneous movement - official scenarios", () => {
  it("moves a following chain of three robots", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 0, 0, "EAST");
    state = robot(state, "R2", 1, 0, "EAST");
    state = robot(state, "R3", 2, 0, "EAST");

    state = move(state, "R1", "R2", "R3");

    const result = executeTick(state);

    expect(positions(result.state)).toEqual({
      R1: { x: 1, y: 0 },
      R2: { x: 2, y: 0 },
      R3: { x: 3, y: 0 }
    });

    expect(
      result.results.every(r => r.status === "MOVED")
    ).toBe(true);
  });

  it("blocks a head-on swap", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 0, 0, "EAST");
    state = robot(state, "R2", 1, 0, "WEST");

    state = move(state, "R1", "R2");

    const result = executeTick(state);

    expect(positions(result.state)).toEqual({
      R1: { x: 0, y: 0 },
      R2: { x: 1, y: 0 }
    });

    expect(
      result.results.every(r => r.status === "BLOCKED")
    ).toBe(true);

    expect(
      result.results.every(r => r.reason === "SWAP")
    ).toBe(true);
  });

  it("resolves a contested cell and blocks the follower", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 0, 1, "EAST");
    state = robot(state, "R2", 2, 1, "WEST");
    state = robot(state, "R3", 3, 1, "WEST");

    state = move(state, "R1", "R2", "R3");

    const result = executeTick(state);

    expect(positions(result.state)).toEqual({
      R1: { x: 1, y: 1 },
      R2: { x: 2, y: 1 },
      R3: { x: 3, y: 1 }
    });

    expect(
      result.results.find(r => r.robotId === "R1")?.status
    ).toBe("MOVED");

    expect(
      result.results.find(r => r.robotId === "R2")?.reason
    ).toBe("CONTESTED");

    expect(
      result.results.find(r => r.robotId === "R3")?.status
    ).toBe("BLOCKED");
  });

  it("allows a four-robot circular rotation", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 0, 0, "NORTH");
    state = robot(state, "R2", 0, 1, "EAST");
    state = robot(state, "R3", 1, 1, "SOUTH");
    state = robot(state, "R4", 1, 0, "WEST");

    state = move(state, "R1", "R2", "R3", "R4");

    const result = executeTick(state);

    expect(positions(result.state)).toEqual({
      R1: { x: 0, y: 1 },
      R2: { x: 1, y: 1 },
      R3: { x: 1, y: 0 },
      R4: { x: 0, y: 0 }
    });

    expect(
      result.results.every(r => r.status === "MOVED")
    ).toBe(true);
  });
});

describe("Simultaneous movement - additional edge cases", () => {
  it("uses numeric robot IDs for contested cells", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R10", 0, 1, "EAST");
    state = robot(state, "R2", 2, 1, "WEST");

    state = move(state, "R10", "R2");

    const result = executeTick(state);

    expect(positions(result.state)).toEqual({
      R10: { x: 0, y: 1 },
      R2: { x: 1, y: 1 }
    });
  });

  it("propagates blocking through a following chain", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 0, 0, "EAST");
    state = robot(state, "R2", 1, 0, "EAST");
    state = robot(state, "R3", 2, 0, "EAST");

    state = addObstacle(state, { x: 3, y: 0 });
    state = move(state, "R1", "R2", "R3");

    const result = executeTick(state);

    expect(positions(result.state)).toEqual({
      R1: { x: 0, y: 0 },
      R2: { x: 1, y: 0 },
      R3: { x: 2, y: 0 }
    });

    expect(
      result.results.every(r => r.status === "BLOCKED")
    ).toBe(true);
  });

  it("blocks movement into a stationary robot", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 0, 0, "EAST");
    state = robot(state, "R2", 1, 0, "NORTH");

    state = move(state, "R1");

    const result = executeTick(state);

    expect(result.state.robots[0].position).toEqual({
      x: 0,
      y: 0
    });

    expect(result.results[0].status).toBe("BLOCKED");
    expect(result.results[1].status).toBe("IDLE");
  });

  it("consumes blocked MOVE commands", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 4, 0, "EAST");

    state = queueCommands(state, "R1", [
      "MOVE",
      "LEFT"
    ]);

    const result = executeTick(state);

    expect(result.state.robots[0].queue).toEqual([
      "LEFT"
    ]);
  });

  it("produces the same positions regardless of placement order", () => {
    let first = createSimulation(5, 5);

    first = robot(first, "R1", 0, 0, "EAST");
    first = robot(first, "R2", 1, 0, "EAST");
    first = robot(first, "R3", 2, 0, "EAST");

    first = move(first, "R1", "R2", "R3");

    let second = createSimulation(5, 5);

    second = robot(second, "R3", 2, 0, "EAST");
    second = robot(second, "R1", 0, 0, "EAST");
    second = robot(second, "R2", 1, 0, "EAST");

    second = move(second, "R3", "R1", "R2");

    const firstResult = executeTick(first);
    const secondResult = executeTick(second);

    expect(positions(firstResult.state)).toEqual(
      positions(secondResult.state)
    );
  });

  it("records tick results for all robots", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 0, 0, "EAST");
    state = robot(state, "R2", 4, 4, "NORTH");

    state = move(state, "R1");

    const previousHistoryLength = state.history.length;
    const result = executeTick(state);

    expect(result.results).toHaveLength(2);

    expect(result.state.history.length).toBe(
      previousHistoryLength + 2
    );
  });

  it("does not mutate original robot positions", () => {
    let state = createSimulation(5, 5);

    state = robot(state, "R1", 0, 0, "EAST");
    state = robot(state, "R2", 1, 0, "EAST");

    state = move(state, "R1", "R2");

    const result = executeTick(state);

    expect(positions(state)).toEqual({
      R1: { x: 0, y: 0 },
      R2: { x: 1, y: 0 }
    });

    expect(positions(result.state)).toEqual({
      R1: { x: 1, y: 0 },
      R2: { x: 2, y: 0 }
    });
  });
});
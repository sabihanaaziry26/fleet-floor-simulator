
import { describe, expect, it } from "vitest";

import { createSimulation } from "../src/state.js";
import { placeRobot } from "../src/placement.js";
import { addCharger } from "../src/chargers.js";
import { queueCommands } from "../src/commands.js";
import { queueGoto } from "../src/goto.js";
import { executeTick } from "../src/tick.js";

function withBattery(
  state: ReturnType<typeof createSimulation>,
  battery: number
) {
  return {
    ...state,
    robots: state.robots.map(robot => ({
      ...robot,
      battery
    }))
  };
}

describe("Battery behavior during simulation ticks", () => {
  it("consumes 1 battery on a successful MOVE", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = queueCommands(state, "R1", ["MOVE"]);

    const output = executeTick(state);

    expect(output.state.robots[0].battery).toBe(99);
    expect(output.state.robots[0].position).toEqual({
      x: 1,
      y: 0
    });
    expect(output.results[0].status).toBe("MOVED");
  });

  it("does not consume battery for LEFT or RIGHT", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 1, y: 1 }, "NORTH");

    state = queueCommands(state, "R1", [
      "LEFT",
      "RIGHT"
    ]);

    state = executeTick(state).state;
    expect(state.robots[0].battery).toBe(100);

    state = executeTick(state).state;
    expect(state.robots[0].battery).toBe(100);
  });

  it("does not consume battery for a wall-blocked MOVE", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 0, y: 0 }, "WEST");
    state = queueCommands(state, "R1", ["MOVE"]);

    const output = executeTick(state);

    expect(output.state.robots[0].battery).toBe(100);
    expect(output.results[0].status).toBe("BLOCKED");
    expect(output.results[0].reason).toBe("WALL");
  });

  it("blocks movement with NO_BATTERY when battery is zero", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = withBattery(state, 0);
    state = queueCommands(state, "R1", ["MOVE"]);

    const output = executeTick(state);

    expect(output.results[0].status).toBe("BLOCKED");
    expect(output.results[0].reason).toBe("NO_BATTERY");
    expect(output.state.robots[0].position).toEqual({
      x: 0,
      y: 0
    });
    expect(output.state.robots[0].battery).toBe(0);
    expect(output.state.robots[0].queue).toEqual([]);
  });

  it("consumes battery when GOTO moves successfully", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = queueGoto(state, "R1", { x: 2, y: 0 });

    const output = executeTick(state);

    expect(output.state.robots[0].battery).toBe(99);
    expect(output.results[0].status).toBe("MOVED");

    expect(output.state.robots[0].queue[0]).toMatchObject({
      type: "GOTO",
      target: { x: 2, y: 0 }
    });
  });

  it("keeps GOTO queued when battery is empty", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = withBattery(state, 0);
    state = queueGoto(state, "R1", { x: 2, y: 0 });

    const output = executeTick(state);

    expect(output.results[0].status).toBe("BLOCKED");
    expect(output.results[0].reason).toBe("NO_BATTERY");
    expect(output.state.robots[0].battery).toBe(0);

    expect(output.state.robots[0].queue[0]).toMatchObject({
      type: "GOTO",
      target: { x: 2, y: 0 },
      blockedTicks: 0
    });
  });

  it("recharges an idle robot on a charger by 10", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 2, y: 2 }, "NORTH");
    state = addCharger(state, { x: 2, y: 2 });
    state = withBattery(state, 50);

    const output = executeTick(state);

    expect(output.state.robots[0].battery).toBe(60);
    expect(output.results[0].status).toBe("IDLE");
  });

  it("caps battery recharge at 100", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 2, y: 2 }, "NORTH");
    state = addCharger(state, { x: 2, y: 2 });
    state = withBattery(state, 97);

    const output = executeTick(state);

    expect(output.state.robots[0].battery).toBe(100);
  });

  it("charges after moving onto a charger", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = addCharger(state, { x: 1, y: 0 });
    state = withBattery(state, 50);
    state = queueCommands(state, "R1", ["MOVE"]);

    const output = executeTick(state);

    expect(output.state.robots[0].battery).toBe(59);
    expect(output.state.robots[0].position).toEqual({
      x: 1,
      y: 0
    });
    expect(output.results[0].status).toBe("MOVED");
  });

  it("recharges a zero-battery robot at the end of a blocked tick", () => {
    let state = createSimulation(5, 5);
    state = placeRobot(state, "R1", { x: 0, y: 0 }, "EAST");
    state = addCharger(state, { x: 0, y: 0 });
    state = withBattery(state, 0);
    state = queueCommands(state, "R1", ["MOVE"]);

    const output = executeTick(state);

    expect(output.results[0].status).toBe("BLOCKED");
    expect(output.results[0].reason).toBe("NO_BATTERY");
    expect(output.state.robots[0].battery).toBe(10);
    expect(output.state.robots[0].position).toEqual({
      x: 0,
      y: 0
    });
  });
});

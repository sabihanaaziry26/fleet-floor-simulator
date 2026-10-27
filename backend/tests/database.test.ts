import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SimulationDatabase } from "../src/database.js";
import { createSimulation } from "../../engine/src/state.js";
import {
  placeRobot,
  addObstacle
} from "../../engine/src/placement.js";
import { queueCommands } from "../../engine/src/commands.js";

describe("SQLite persistence", () => {
  it("preserves simulation state after closing and reopening", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "fleet-simulator-")
    );

    const databasePath = join(directory, "test.sqlite");

    let database: SimulationDatabase | undefined;

    try {
      database = new SimulationDatabase(databasePath);

      let state = createSimulation(5, 5);

      state = placeRobot(
        state,
        "R1",
        { x: 1, y: 2 },
        "EAST"
      );

      state = addObstacle(state, { x: 3, y: 3 });

      state = queueCommands(
        state,
        "R1",
        ["MOVE", "RIGHT"]
      );

      database.save(state);
      database.close();
      database = undefined;

      // Simulate a backend restart.
      database = new SimulationDatabase(databasePath);

      const restored = database.load();

      expect(restored).toEqual(state);

      expect(restored.floor).toEqual({
        width: 5,
        height: 5,
        obstacles: [{ x: 3, y: 3 }]
      });

      expect(restored.robots[0].queue).toEqual([
        "MOVE",
        "RIGHT"
      ]);

      expect(restored.history).toHaveLength(3);
    } finally {
      database?.close();
      rmSync(directory, {
        recursive: true,
        force: true
      });
    }
  });

  it("creates the default simulation when the database is empty", () => {
    const database = new SimulationDatabase(":memory:");

    try {
      const state = database.load();

      expect(state.floor.width).toBe(10);
      expect(state.floor.height).toBe(8);
      expect(state.robots).toEqual([]);
      expect(state.tick).toBe(0);
    } finally {
      database.close();
    }
  });
});
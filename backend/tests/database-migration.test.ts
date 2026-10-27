
import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SimulationDatabase } from "../src/database.js";

describe("SQLite backward compatibility", () => {
  it("migrates old simulations without losing data", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "fleet-migration-")
    );

    const databasePath = join(directory, "legacy.sqlite");

    let database: SimulationDatabase | undefined;

    try {
      // Simulate a database created before battery
      // and charger fields existed.
      const legacyState = {
        floor: {
          width: 5,
          height: 5,
          obstacles: [{ x: 3, y: 3 }]
        },
        robots: [
          {
            id: "R1",
            position: { x: 1, y: 2 },
            facing: "EAST",
            queue: ["MOVE", "RIGHT"]
          }
        ],
        tick: 7,
        history: [
          {
            tick: 0,
            type: "ROBOT_PLACED",
            robotId: "R1",
            message: "R1 placed at 1,2,EAST"
          }
        ]
      };

      const rawDatabase = new DatabaseSync(databasePath);

      rawDatabase.exec(`
        CREATE TABLE simulations (
          id INTEGER PRIMARY KEY,
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      rawDatabase
        .prepare(
          "INSERT INTO simulations (id, state_json) VALUES (1, ?)"
        )
        .run(JSON.stringify(legacyState));

      rawDatabase.close();

      // Open the legacy database using the new code.
      database = new SimulationDatabase(databasePath);

      const migrated = database.load();

      // New fields receive their defaults.
      expect(migrated.floor.chargers).toEqual([]);
      expect(migrated.robots[0].battery).toBe(100);

      // All existing simulation data is preserved.
      expect(migrated.floor.obstacles).toEqual([
        { x: 3, y: 3 }
      ]);

      expect(migrated.robots[0].position).toEqual({
        x: 1,
        y: 2
      });

      expect(migrated.robots[0].facing).toBe("EAST");
      expect(migrated.robots[0].queue).toEqual([
        "MOVE",
        "RIGHT"
      ]);

      expect(migrated.tick).toBe(7);
      expect(migrated.history).toEqual(
        legacyState.history
      );

      // Verify the migration persists after restart.
      database.close();
      database = undefined;

      database = new SimulationDatabase(databasePath);

      const reopened = database.load();

      expect(reopened).toEqual(migrated);
      expect(reopened.robots[0].battery).toBe(100);
      expect(reopened.floor.chargers).toEqual([]);
    } finally {
      database?.close();

      rmSync(directory, {
        recursive: true,
        force: true
      });
    }
  });

  it("preserves existing battery levels and chargers", () => {
    const database = new SimulationDatabase(":memory:");

    try {
      const original = {
        floor: {
          width: 5,
          height: 5,
          obstacles: [],
          chargers: [{ x: 2, y: 2 }]
        },
        robots: [
          {
            id: "R1",
            position: { x: 2, y: 2 },
            facing: "NORTH" as const,
            queue: [],
            battery: 45
          }
        ],
        tick: 3,
        history: []
      };

      database.save(original);

      const restored = database.load();

      expect(restored.robots[0].battery).toBe(45);
      expect(restored.floor.chargers).toEqual([
        { x: 2, y: 2 }
      ]);

      expect(restored).toEqual(original);
    } finally {
      database.close();
    }
  });
});


import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { SimulationState } from "../../engine/src/types.js";
import { createSimulation } from "../../engine/src/state.js";

const DEFAULT_DATABASE_PATH = resolve(
  process.cwd(),
  "data",
  "fleet.sqlite"
);

export class SimulationDatabase {
  private database: DatabaseSync;

  constructor(databasePath: string = DEFAULT_DATABASE_PATH) {
    if (databasePath !== ":memory:") {
      mkdirSync(dirname(resolve(databasePath)), {
        recursive: true
      });
    }

    this.database = new DatabaseSync(databasePath);

    this.database.exec(`
      CREATE TABLE IF NOT EXISTS simulations (
        id INTEGER PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  load(): SimulationState {
    const row = this.database
      .prepare(
        "SELECT state_json FROM simulations WHERE id = 1"
      )
      .get() as { state_json: string } | undefined;

    if (!row) {
      const initialState = createSimulation();

      this.save(initialState);

      return initialState;
    }

    // Load the saved simulation.
    const saved = JSON.parse(row.state_json) as SimulationState;

    // Support older simulations saved before chargers existed.
    const floor = {
      ...saved.floor,
      chargers: Array.isArray(saved.floor.chargers)
        ? saved.floor.chargers
        : []
    };

    // Support robots saved before battery functionality existed.
    const robots = saved.robots.map(robot => ({
      ...robot,
      battery:
        typeof robot.battery === "number" &&
        Number.isFinite(robot.battery)
          ? Math.max(0, Math.min(100, robot.battery))
          : 100
    }));

    const migrated: SimulationState = {
      ...saved,
      floor,
      robots
    };

    // Persist the normalized state for future restarts.
    this.save(migrated);

    return migrated;
  }

  save(state: SimulationState): void {
    const json = JSON.stringify(state);

    this.database
      .prepare(`
        INSERT INTO simulations (id, state_json, updated_at)
        VALUES (1, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          state_json = excluded.state_json,
          updated_at = CURRENT_TIMESTAMP
      `)
      .run(json);
  }

  close(): void {
    this.database.close();
  }
}

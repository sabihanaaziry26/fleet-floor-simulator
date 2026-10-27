import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { SimulationState } from "../../engine/src/types.js";
import { createSimulation } from "../../engine/src/state.js";

// The backend is started from the backend directory.
// This path works for both development and production.
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

    return JSON.parse(row.state_json) as SimulationState;
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
import type { SimulationState } from "../../engine/src/types.js";
import { SimulationDatabase } from "./database.js";

export class SimulationRepository {
  private database: SimulationDatabase;

  constructor(database?: SimulationDatabase) {
    this.database = database ?? new SimulationDatabase();
  }

  getState(): SimulationState {
    return this.database.load();
  }

  saveState(state: SimulationState): void {
    this.database.save(state);
  }

  close(): void {
    this.database.close();
  }
}
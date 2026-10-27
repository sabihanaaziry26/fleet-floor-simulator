
import { Router } from "express";

import {
  addCharger,
  removeCharger
} from "../../engine/src/chargers.js";

import { SimulationRepository } from "./simulationRepository.js";

export function createChargersRouter(
  repository: SimulationRepository
) {
  const router = Router();

  router.post("/chargers", (req, res) => {
    try {
      const { x, y } = req.body ?? {};

      if (
        !Number.isSafeInteger(x) ||
        !Number.isSafeInteger(y)
      ) {
        res.status(400).json({
          error: "Charger coordinates must be integers"
        });
        return;
      }

      const state = repository.getState();
      const updated = addCharger(state, { x, y });

      if (updated === state) {
        res.status(409).json({
          error: "Invalid charger location"
        });
        return;
      }

      repository.saveState(updated);

      res.status(201).json({
        message: `Charger added at ${x},${y}`,
        state: updated
      });
    } catch (error) {
      console.error("Failed to add charger:", error);

      res.status(500).json({
        error: "Unable to add charger"
      });
    }
  });

  router.delete("/chargers", (req, res) => {
    try {
      const { x, y } = req.body ?? {};

      if (
        !Number.isSafeInteger(x) ||
        !Number.isSafeInteger(y)
      ) {
        res.status(400).json({
          error: "Charger coordinates must be integers"
        });
        return;
      }

      const state = repository.getState();
      const updated = removeCharger(state, { x, y });

      if (updated === state) {
        res.status(404).json({
          error: "Charger not found"
        });
        return;
      }

      repository.saveState(updated);

      res.status(200).json({
        message: `Charger removed at ${x},${y}`,
        state: updated
      });
    } catch (error) {
      console.error("Failed to remove charger:", error);

      res.status(500).json({
        error: "Unable to remove charger"
      });
    }
  });

  return router;
}

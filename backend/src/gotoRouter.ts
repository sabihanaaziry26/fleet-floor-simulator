
import { Router } from "express";
import { queueGoto } from "../../engine/src/goto.js";
import { SimulationRepository } from "./simulationRepository.js";

export function createGotoRouter(
  repository: SimulationRepository
) {
  const router = Router();

  router.post("/robots/:id/goto", (req, res) => {
    try {
      const id = req.params.id;
      const { x, y } = req.body ?? {};

      if (
        typeof id !== "string" ||
        !Number.isSafeInteger(x) ||
        !Number.isSafeInteger(y)
      ) {
        res.status(400).json({
          error: "GOTO coordinates must be integers"
        });
        return;
      }

      const state = repository.getState();

      if (!state.robots.some(robot => robot.id === id)) {
        res.status(404).json({
          error: `Robot ${id} not found`
        });
        return;
      }

      const updated = queueGoto(state, id, { x, y });

      if (updated === state) {
        res.status(409).json({
          error: "Invalid GOTO destination"
        });
        return;
      }

      repository.saveState(updated);

      res.status(200).json({
        message: `GOTO ${x},${y} queued for ${id}`,
        state: updated
      });
    } catch (error) {
      console.error("Failed to queue GOTO:", error);

      res.status(500).json({
        error: "Unable to queue GOTO"
      });
    }
  });

  return router;
}

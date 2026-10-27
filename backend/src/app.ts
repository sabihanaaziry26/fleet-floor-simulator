import express from "express";
import cors from "cors";

import type {
  Direction,
  Position
} from "../../engine/src/types.js";

import {
  placeRobot,
  addObstacle,
  removeObstacle
} from "../../engine/src/placement.js";

import { queueCommands } from "../../engine/src/commands.js";
import { executeTick } from "../../engine/src/tick.js";
import { resetSimulation } from "../../engine/src/reset.js";

import { SimulationRepository } from "./simulationRepository.js";
import { createGotoRouter } from "./gotoRouter.js";

const DIRECTIONS: Direction[] = [
  "NORTH",
  "EAST",
  "SOUTH",
  "WEST"
];

function validPosition(x: unknown, y: unknown): boolean {
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    Number.isSafeInteger(x) &&
    Number.isSafeInteger(y)
  );
}

export function createApp(repository: SimulationRepository) {
  const app = express();

  app.use(cors({ origin: "http://localhost:5173" }));
  app.use(express.json());
  app.use("/api", createGotoRouter(repository));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      application: "Fleet Floor Simulator",
      message: "Backend API is running"
    });
  });

  app.get("/api/simulation", (_req, res) => {
    try {
      res.status(200).json(repository.getState());
    } catch (error) {
      console.error("Failed to retrieve simulation:", error);
      res.status(500).json({
        error: "Unable to retrieve simulation"
      });
    }
  });

  app.post("/api/robots", (req, res) => {
    try {
      const { id, x, y, facing = "NORTH" } = req.body ?? {};

      if (
        typeof id !== "string" ||
        !/^R[1-9]\d*$/.test(id) ||
        !validPosition(x, y) ||
        typeof facing !== "string" ||
        !DIRECTIONS.includes(facing as Direction)
      ) {
        res.status(400).json({
          error: "Invalid robot ID, position, or direction"
        });
        return;
      }

      const state = repository.getState();

      if (state.robots.some(robot => robot.id === id)) {
        res.status(409).json({
          error: `Robot ${id} already exists`
        });
        return;
      }

      const updated = placeRobot(
        state,
        id,
        { x, y },
        facing as Direction
      );

      if (updated === state) {
        res.status(409).json({
          error: "Robot cannot be placed on this cell"
        });
        return;
      }

      repository.saveState(updated);

      res.status(201).json({
        message: `Robot ${id} created`,
        state: updated
      });
    } catch (error) {
      console.error("Robot placement failed:", error);
      res.status(500).json({
        error: "Unable to create robot"
      });
    }
  });

  app.post("/api/robots/:id/commands", (req, res) => {
    try {
      const id = req.params.id;
      const { commands } = req.body ?? {};

      if (
        typeof id !== "string" ||
        !Array.isArray(commands) ||
        commands.length === 0 ||
        !commands.every(
          command =>
            typeof command === "string" &&
            ["MOVE", "LEFT", "RIGHT"].includes(
              command.toUpperCase()
            )
        )
      ) {
        res.status(400).json({
          error: "Commands must be a non-empty array of MOVE, LEFT, or RIGHT"
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

      const updated = queueCommands(state, id, commands);

      repository.saveState(updated);

      res.status(200).json({
        message: `Commands queued for ${id}`,
        state: updated
      });
    } catch (error) {
      console.error("Failed to queue commands:", error);
      res.status(500).json({
        error: "Unable to queue commands"
      });
    }
  });

  app.post("/api/tick", (_req, res) => {
    try {
      const result = executeTick(repository.getState());

      repository.saveState(result.state);

      res.status(200).json({
        state: result.state,
        results: result.results
      });
    } catch (error) {
      console.error("Tick execution failed:", error);
      res.status(500).json({
        error: "Unable to execute tick"
      });
    }
  });

  app.post("/api/obstacles", (req, res) => {
    try {
      const { x, y } = req.body ?? {};

      if (!validPosition(x, y)) {
        res.status(400).json({
          error: "Obstacle coordinates must be integers"
        });
        return;
      }

      const state = repository.getState();
      const updated = addObstacle(state, { x, y });

      if (updated === state) {
        res.status(409).json({
          error: "Obstacle cannot be added to this cell"
        });
        return;
      }

      repository.saveState(updated);

      res.status(201).json({
        message: "Obstacle added",
        state: updated
      });
    } catch (error) {
      console.error("Failed to add obstacle:", error);
      res.status(500).json({
        error: "Unable to add obstacle"
      });
    }
  });

  app.delete("/api/obstacles", (req, res) => {
    try {
      const { x, y } = req.body ?? {};

      if (!validPosition(x, y)) {
        res.status(400).json({
          error: "Obstacle coordinates must be integers"
        });
        return;
      }

      const state = repository.getState();
      const updated = removeObstacle(state, { x, y });

      if (updated === state) {
        res.status(404).json({
          error: "No obstacle exists at this cell"
        });
        return;
      }

      repository.saveState(updated);

      res.status(200).json({
        message: "Obstacle removed",
        state: updated
      });
    } catch (error) {
      console.error("Failed to remove obstacle:", error);
      res.status(500).json({
        error: "Unable to remove obstacle"
      });
    }
  });

  app.post("/api/simulation/reset", (req, res) => {
    try {
      const { width = 10, height = 8 } = req.body ?? {};

      if (
        !validPosition(width, height) ||
        width < 1 ||
        width > 20 ||
        height < 1 ||
        height > 20
      ) {
        res.status(400).json({
          error: "Floor dimensions must be integers between 1 and 20"
        });
        return;
      }

      const state = resetSimulation(width, height);

      repository.saveState(state);

      res.status(200).json({
        message: "Simulation reset successfully",
        state
      });
    } catch (error) {
      console.error("Simulation reset failed:", error);
      res.status(500).json({
        error: "Unable to reset simulation"
      });
    }
  });

  return app;
}
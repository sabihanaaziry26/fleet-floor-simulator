
import { readFileSync } from "node:fs";

import { createSimulation } from "../engine/src/state.js";
import {
  placeRobot,
  addObstacle
} from "../engine/src/placement.js";
import { addCharger } from "../engine/src/chargers.js";
import { queueCommands } from "../engine/src/commands.js";
import { queueGoto } from "../engine/src/goto.js";
import { executeTick } from "../engine/src/tick.js";

import type {
  Direction,
  Position,
  SimulationState
} from "../engine/src/types.js";

// CLI scenarios default to 5x5.
function newScenario(): SimulationState {
  return createSimulation(5, 5);
}

function parsePosition(
  value: string
): Position | null {
  const match = /^(\d+),(\d+)$/.exec(value);

  if (!match) {
    return null;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);

  if (
    !Number.isSafeInteger(x) ||
    !Number.isSafeInteger(y)
  ) {
    return null;
  }

  return { x, y };
}

function parseDirection(
  value: string
): Direction | null {
  const direction = value.toUpperCase();

  if (
    direction === "NORTH" ||
    direction === "EAST" ||
    direction === "SOUTH" ||
    direction === "WEST"
  ) {
    return direction;
  }

  return null;
}

function numericId(id: string): number {
  return Number(id.slice(1));
}

function sortedRobots(state: SimulationState) {
  return [...state.robots].sort(
    (a, b) => numericId(a.id) - numericId(b.id)
  );
}

function formatReport(
  state: SimulationState
): string {
  if (state.robots.length === 0) {
    return "EMPTY";
  }

  return sortedRobots(state)
    .map(
      robot =>
        `${robot.id} ${robot.position.x},${robot.position.y},${robot.facing}`
    )
    .join("\n");
}

function formatBatteryReport(
  state: SimulationState
): string {
  if (state.robots.length === 0) {
    return "EMPTY";
  }

  return sortedRobots(state)
    .map(
      robot => `${robot.id} ${robot.battery}`
    )
    .join("\n");
}

export function runScenario(source: string): string {
  let state = newScenario();
  const reports: string[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    // Ignore blank lines and full-line comments.
    if (!line || line.startsWith("#")) {
      continue;
    }

    const parts = line.toUpperCase().split(/\s+/);
    const command = parts[0];

    if (command === "FLOOR") {
      if (parts.length !== 2) {
        continue;
      }

      const dimensions = parsePosition(parts[1]);

      if (!dimensions) {
        continue;
      }

      try {
        state = createSimulation(
          dimensions.x,
          dimensions.y
        );
      } catch {
        // Invalid dimensions are ignored.
      }

      continue;
    }

    if (command === "OBSTACLE") {
      if (parts.length !== 2) {
        continue;
      }

      const position = parsePosition(parts[1]);

      if (position) {
        state = addObstacle(state, position);
      }

      continue;
    }

    if (command === "CHARGER") {
      if (parts.length !== 2) {
        continue;
      }

      const position = parsePosition(parts[1]);

      if (position) {
        state = addCharger(state, position);
      }

      continue;
    }

    if (command === "PLACE") {
      if (parts.length !== 3) {
        continue;
      }

      const id = parts[1];
      const details = parts[2].split(",");

      if (details.length !== 3) {
        continue;
      }

      const position = parsePosition(
        `${details[0]},${details[1]}`
      );

      const facing = parseDirection(
        details[2]
      );

      if (position && facing) {
        state = placeRobot(
          state,
          id,
          position,
          facing
        );
      }

      continue;
    }

    if (command === "QUEUE") {
      if (parts.length < 3) {
        continue;
      }

      // Advanced command:
      // QUEUE R1 GOTO 4,3
      if (
        parts.length === 4 &&
        parts[2] === "GOTO"
      ) {
        const position = parsePosition(
          parts[3]
        );

        if (position) {
          state = queueGoto(
            state,
            parts[1],
            position
          );
        }

        continue;
      }

      // Original MOVE, LEFT, RIGHT commands.
      state = queueCommands(
        state,
        parts[1],
        parts.slice(2)
      );

      continue;
    }

    if (command === "TICK") {
      if (parts.length > 2) {
        continue;
      }

      const count =
        parts.length === 1
          ? 1
          : Number(parts[1]);

      if (
        !Number.isSafeInteger(count) ||
        count < 1
      ) {
        continue;
      }

      for (let i = 0; i < count; i++) {
        state = executeTick(state).state;
      }

      continue;
    }

    if (command === "REPORT") {
      if (parts.length === 1) {
        reports.push(formatReport(state));
      } else if (
        parts.length === 2 &&
        parts[1] === "BATTERY"
      ) {
        reports.push(
          formatBatteryReport(state)
        );
      }

      continue;
    }

    // Unknown or malformed commands are ignored.
  }

  return reports.join("\n");
}

// Run when called from the command line.
const scenarioPath = process.argv[2];

if (!scenarioPath) {
  console.error(
    "Usage: npm run scenario -- path/to/scenario.txt"
  );

  process.exitCode = 1;
} else {
  try {
    const source = readFileSync(
      scenarioPath,
      "utf8"
    );

    const output = runScenario(source);

    if (output) {
      process.stdout.write(
        `${output}\n`
      );
    }
  } catch {
    console.error(
      `Unable to read scenario file: ${scenarioPath}`
    );

    process.exitCode = 1;
  }
}

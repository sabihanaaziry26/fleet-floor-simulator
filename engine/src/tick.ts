import type {
  Position,
  Robot,
  SimulationState,
  TickResult
} from "./types.js";

import {
  turnLeft,
  turnRight,
  nextPosition
} from "./direction.js";

import { isInsideFloor } from "./floor.js";

export interface TickOutput {
  state: SimulationState;
  results: TickResult[];
}

type MoveOutcome = {
  success: boolean;
  reason?: string;
};

function samePosition(
  a: Position,
  b: Position
): boolean {
  return a.x === b.x && a.y === b.y;
}

function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}

function robotNumber(id: string): number {
  return Number(id.slice(1));
}

export function executeTick(
  state: SimulationState
): TickOutput {
  const nextTick = state.tick + 1;

  // All movement decisions use the original positions.
  const originalRobots = state.robots;

  const occupants = new Map<string, Robot>();

  for (const robot of originalRobots) {
    occupants.set(positionKey(robot.position), robot);
  }

  // Phase 1: Collect every MOVE intention.
  const intentions = new Map<string, Position>();
  const outcomes = new Map<string, MoveOutcome>();

  for (const robot of originalRobots) {
    if (robot.queue[0] !== "MOVE") {
      continue;
    }

    const destination = nextPosition(
      robot.position,
      robot.facing
    );

    if (!isInsideFloor(state.floor, destination)) {
      outcomes.set(robot.id, {
        success: false,
        reason: "WALL"
      });
      continue;
    }

    const isObstacle = state.floor.obstacles.some(
      obstacle => samePosition(obstacle, destination)
    );

    if (isObstacle) {
      outcomes.set(robot.id, {
        success: false,
        reason: "OBSTACLE"
      });
      continue;
    }

    intentions.set(robot.id, destination);
  }

  // Phase 2: Resolve contested destinations.
  const contenders = new Map<string, string[]>();

  for (const [id, destination] of intentions) {
    const key = positionKey(destination);
    const existing = contenders.get(key) ?? [];

    existing.push(id);
    contenders.set(key, existing);
  }

  for (const ids of contenders.values()) {
    if (ids.length <= 1) {
      continue;
    }

    ids.sort(
      (a, b) => robotNumber(a) - robotNumber(b)
    );

    // The lowest numeric ID wins the right to try.
    for (const loser of ids.slice(1)) {
      outcomes.set(loser, {
        success: false,
        reason: "CONTESTED"
      });
    }
  }

  // Phase 3: Resolve dependencies between robots.
  //
  // A robot can enter an occupied cell only when its
  // occupant successfully leaves in this same tick.
  //
  // We follow dependency chains and detect cycles.
  const visiting: string[] = [];

  function resolveMove(id: string): MoveOutcome {
    const known = outcomes.get(id);

    if (known) {
      return known;
    }

    const cycleStart = visiting.indexOf(id);

    if (cycleStart !== -1) {
      const cycle = visiting.slice(cycleStart);

      if (cycle.length >= 3) {
        // Rotations involving 3+ robots succeed.
        for (const cycleId of cycle) {
          outcomes.set(cycleId, {
            success: true
          });
        }

        return { success: true };
      }

      // Two robots exchanging positions cannot move.
      for (const cycleId of cycle) {
        outcomes.set(cycleId, {
          success: false,
          reason: "SWAP"
        });
      }

      return {
        success: false,
        reason: "SWAP"
      };
    }

    const destination = intentions.get(id);

    if (!destination) {
      return {
        success: false,
        reason: "NO_MOVE"
      };
    }

    visiting.push(id);

    const occupant = occupants.get(
      positionKey(destination)
    );

    let outcome: MoveOutcome;

    if (!occupant) {
      // An empty destination is available.
      outcome = { success: true };
    } else if (!intentions.has(occupant.id)) {
      // The occupant has no valid movement intention.
      outcome = {
        success: false,
        reason: "OCCUPIED"
      };
    } else {
      const dependency = resolveMove(occupant.id);

      outcome = dependency.success
        ? { success: true }
        : {
            success: false,
            reason: "BLOCKED_BY_ROBOT"
          };
    }

    visiting.pop();

    // Preserve any outcome assigned during cycle detection.
    if (!outcomes.has(id)) {
      outcomes.set(id, outcome);
    }

    return outcomes.get(id)!;
  }

  for (const id of intentions.keys()) {
    resolveMove(id);
  }

  // Phase 4: Apply all results together.
  const results: TickResult[] = [];

  const robots = originalRobots.map(robot => {
    const command = robot.queue[0] ?? null;

    let updated: Robot = {
      ...robot,
      position: { ...robot.position },
      queue: robot.queue.slice(command ? 1 : 0)
    };

    let status: TickResult["status"] = "IDLE";
    let reason: string | undefined;

    if (command === "LEFT") {
      updated = {
        ...updated,
        facing: turnLeft(robot.facing)
      };

      status = "TURNED";
    } else if (command === "RIGHT") {
      updated = {
        ...updated,
        facing: turnRight(robot.facing)
      };

      status = "TURNED";
    } else if (command === "MOVE") {
      const outcome = outcomes.get(robot.id);

      if (outcome?.success) {
        updated = {
          ...updated,
          position: { ...intentions.get(robot.id)! }
        };

        status = "MOVED";
      } else {
        status = "BLOCKED";
        reason = outcome?.reason ?? "OCCUPIED";
      }
    }

    results.push({
      robotId: robot.id,
      command,
      status,
      reason,
      from: { ...robot.position },
      to: { ...updated.position },
      facing: updated.facing
    });

    return updated;
  });

  // Phase 5: Record a result for every robot.
  const events = results.map(result => ({
    tick: nextTick,
    type: "TICK_RESULT",
    robotId: result.robotId,
    message: `${result.robotId}: ${result.status}${
      result.reason ? ` (${result.reason})` : ""
    }`
  }));

  return {
    state: {
      ...state,
      tick: nextTick,
      robots,
      history: [...state.history, ...events]
    },
    results
  };
}
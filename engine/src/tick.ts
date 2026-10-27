
import type {
  Direction,
  GotoCommand,
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
import { findNextDirection } from "./pathfinding.js";

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

function isGotoCommand(
  command: Robot["queue"][number] | null
): command is GotoCommand {
  return (
    typeof command === "object" &&
    command !== null &&
    command.type === "GOTO"
  );
}

export function executeTick(
  state: SimulationState
): TickOutput {
  const nextTick = state.tick + 1;
  const originalRobots = state.robots;

  // Every robot makes decisions using positions from
  // the beginning of the tick.
  const occupants = new Map<string, Robot>();

  for (const robot of originalRobots) {
    occupants.set(positionKey(robot.position), robot);
  }

  const intentions = new Map<string, Position>();
  const movementDirections = new Map<string, Direction>();
  const outcomes = new Map<string, MoveOutcome>();

  // Tracks GOTO robots that have no available route.
  const noPathRobots = new Set<string>();

  // GOTO robots already standing on their target.
  const alreadyArrived = new Set<string>();

  // Phase 1: Collect movement intentions.
  for (const robot of originalRobots) {
    const command = robot.queue[0] ?? null;

if (command === "MOVE") {
    if (robot.battery <= 0) {
        outcomes.set(robot.id, {
        success: false,
        reason: "NO_BATTERY"
        });
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
      movementDirections.set(robot.id, robot.facing);
      continue;
    }

    if (!isGotoCommand(command)) {
      continue;
    }

    if (samePosition(robot.position, command.target)) {
      alreadyArrived.add(robot.id);
      continue;
    }

    if (robot.battery <= 0) {
        outcomes.set(robot.id, {
            success: false,
            reason: "NO_BATTERY"
        });
        continue;
    }

    // GOTO treats other robots' current cells as walls.
    // We recalculate the shortest path every tick.
    const blockedPositions = originalRobots
      .filter(other => other.id !== robot.id)
      .map(other => other.position);

    const direction = findNextDirection(
      state.floor,
      robot.position,
      command.target,
      blockedPositions
    );

    if (direction === null) {
      noPathRobots.add(robot.id);
      continue;
    }

    const destination = nextPosition(
      robot.position,
      direction
    );

    intentions.set(robot.id, destination);

    // GOTO changes facing automatically.
    // Turning does not require an additional tick.
    movementDirections.set(robot.id, direction);
  }

  // Phase 2: Resolve contested destinations.
  //
  // Lowest numeric robot ID gets priority.
  const contenders = new Map<string, string[]>();

  for (const [id, destination] of intentions) {
    const key = positionKey(destination);
    const ids = contenders.get(key) ?? [];

    ids.push(id);
    contenders.set(key, ids);
  }

  for (const ids of contenders.values()) {
    if (ids.length <= 1) {
      continue;
    }

    ids.sort(
      (a, b) => robotNumber(a) - robotNumber(b)
    );

    for (const loser of ids.slice(1)) {
      outcomes.set(loser, {
        success: false,
        reason: "CONTESTED"
      });
    }
  }

  // Only winning, potentially successful intentions
  // can make an occupied destination available.
  const activeIntentions = new Map(
    [...intentions].filter(([id]) => !outcomes.has(id))
  );

  // Phase 3: Resolve movement dependencies.
  //
  // Following chains are allowed when the occupant
  // successfully moves away in the same tick.
  // Two-way swaps are blocked.
  // Cycles of 3 or more robots can succeed.
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
        for (const cycleId of cycle) {
          outcomes.set(cycleId, {
            success: true
          });
        }

        return { success: true };
      }

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

    const destination = activeIntentions.get(id);

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
      outcome = { success: true };
    } else if (!activeIntentions.has(occupant.id)) {
      // Distinguish a stationary robot from one that
      // attempted to move but lost a destination contest.
      outcome = {
        success: false,
        reason: intentions.has(occupant.id)
          ? "BLOCKED_BY_ROBOT"
          : "OCCUPIED"
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

    // Cycle detection may have assigned this result.
    if (!outcomes.has(id)) {
      outcomes.set(id, outcome);
    }

    return outcomes.get(id)!;
  }

  for (const id of activeIntentions.keys()) {
    resolveMove(id);
  }

  // Phase 4: Apply all movement results together.
  const results: TickResult[] = [];

  const robots = originalRobots.map(robot => {
    const command = robot.queue[0] ?? null;

    let updated: Robot = {
      ...robot,
      position: { ...robot.position },
      queue: [...robot.queue]
    };

    let status: TickResult["status"] = "IDLE";
    let reason: string | undefined;

    if (command === "LEFT") {
      updated.facing = turnLeft(robot.facing);
      updated.queue = robot.queue.slice(1);
      status = "TURNED";
    } else if (command === "RIGHT") {
      updated.facing = turnRight(robot.facing);
      updated.queue = robot.queue.slice(1);
      status = "TURNED";
    } else if (command === "MOVE") {
      // Ordinary MOVE is always consumed,
      // even when the movement is blocked.
      updated.queue = robot.queue.slice(1);

      const outcome = outcomes.get(robot.id);

      if (outcome?.success) {
        updated.position = {
          ...intentions.get(robot.id)!
        };

        updated.battery = Math.max(0, robot.battery - 1);
        status = "MOVED";
      } else {
        status = "BLOCKED";
        reason = outcome?.reason ?? "OCCUPIED";
      }
    } else if (isGotoCommand(command)) {
      if (alreadyArrived.has(robot.id)) {
        updated.queue = robot.queue.slice(1);
        status = "ARRIVED";
      } else if (noPathRobots.has(robot.id)) {
        const blockedTicks = command.blockedTicks + 1;

        if (blockedTicks >= 3) {
          updated.queue = robot.queue.slice(1);
          status = "UNREACHABLE";
          reason = "NO_PATH";
        } else {
          updated.queue = [
            {
              type: "GOTO",
              target: { ...command.target },
              blockedTicks
            },
            ...robot.queue.slice(1)
          ];

          status = "BLOCKED";
          reason = "NO_PATH";
        }
      } else {
        const outcome = outcomes.get(robot.id);

        if (outcome?.success) {
          updated.position = {
            ...intentions.get(robot.id)!
          };

          updated.battery = Math.max(0, robot.battery - 1);

          updated.facing =
            movementDirections.get(robot.id)!;

          // Reset the no-path counter after moving.
          const continuingGoto: GotoCommand = {
            type: "GOTO",
            target: { ...command.target },
            blockedTicks: 0
          };

          if (samePosition(
            updated.position,
            command.target
          )) {
            updated.queue = robot.queue.slice(1);
            status = "ARRIVED";
          } else {
            updated.queue = [
              continuingGoto,
              ...robot.queue.slice(1)
            ];

            status = "MOVED";
          }
        } else {
          // Keep GOTO queued for retrying next tick.
          updated.queue = [...robot.queue];
          status = "BLOCKED";
          reason = outcome?.reason ?? "OCCUPIED";
        }
      }
    }

    // Charging happens after movement and commands.
    // Robots recharge even when idle or blocked.
    const isOnCharger = state.floor.chargers.some(
        charger => samePosition(charger, updated.position)
    );

    if (isOnCharger) {
        updated.battery = Math.min(
            100,
            updated.battery + 10
        );
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

  // Phase 5: Record every robot's tick outcome.
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

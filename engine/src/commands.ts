import type {
  RobotCommand,
  SimulationState
} from "./types.js";

const VALID_COMMANDS: RobotCommand[] = [
  "MOVE",
  "LEFT",
  "RIGHT"
];

export function isRobotCommand(
  value: string
): value is RobotCommand {
  return VALID_COMMANDS.includes(value as RobotCommand);
}

export function queueCommands(
  state: SimulationState,
  robotId: string,
  commands: string[]
): SimulationState {
  const robot = state.robots.find(
    robot => robot.id === robotId
  );

  // Ignore unknown robots or empty command lists.
  if (!robot || commands.length === 0) {
    return state;
  }

  const normalized = commands.map(
    command => command.toUpperCase()
  );

  // Reject the complete request if any command is invalid.
  if (!normalized.every(isRobotCommand)) {
    return state;
  }

  const validCommands: RobotCommand[] = normalized;

  return {
    ...state,
    robots: state.robots.map(current =>
      current.id === robotId
        ? {
            ...current,
            queue: [
              ...current.queue,
              ...validCommands
            ]
          }
        : current
    ),
    history: [
      ...state.history,
      {
        tick: state.tick,
        type: "COMMANDS_QUEUED",
        robotId,
        message: `${robotId} queued ${validCommands.join(" ")}`
      }
    ]
  };
}
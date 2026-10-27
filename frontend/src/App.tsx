
import { useCallback, useEffect, useState } from "react";
import type { Robot, SimulationState } from "./types";
import "./App.css";
import EventHistory from "./EventHistory";

const API_URL = "http://localhost:3001";
const PLAY_INTERVAL_MS = 800;

type EditMode = "robots" | "obstacles";
type RobotCommand = "MOVE" | "LEFT" | "RIGHT";

interface TickResult {
  robotId: string;
  status: string;
  reason?: string;
}

function getNextRobotId(robots: Robot[]): string {
  const existingIds = new Set(robots.map((robot) => robot.id));
  let number = 1;

  while (existingIds.has(`R${number}`)) {
    number++;
  }

  return `R${number}`;
}

function App() {
  const [simulation, setSimulation] =
    useState<SimulationState | null>(null);

  const [selectedRobotId, setSelectedRobotId] =
    useState<string | null>(null);

  const [editMode, setEditMode] = useState<EditMode>("robots");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [lastTickResults, setLastTickResults] =
    useState<TickResult[]>([]);

  const [floorWidth, setFloorWidth] = useState("10");
  const [floorHeight, setFloorHeight] = useState("8");

  useEffect(() => {
    async function loadSimulation() {
      try {
        const response = await fetch(`${API_URL}/api/simulation`);

        if (!response.ok) {
          throw new Error("Unable to load simulation");
        }

        const data: SimulationState = await response.json();

        setSimulation(data);
        setFloorWidth(String(data.floor.width));
        setFloorHeight(String(data.floor.height));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    }

    void loadSimulation();
  }, []);

  const queueCommand = useCallback(
    async (command: RobotCommand) => {
      if (!simulation || !selectedRobotId || isSaving || isPlaying) {
        return;
      }

      setIsSaving(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/robots/${selectedRobotId}/commands`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ commands: [command] })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to queue command");
        }

        setSimulation(data.state);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to queue command"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [simulation, selectedRobotId, isSaving, isPlaying]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        !selectedRobotId ||
        isSaving ||
        isPlaying ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const commands: Record<string, RobotCommand> = {
        ArrowUp: "MOVE",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT"
      };

      const command = commands[event.key];

      if (command) {
        event.preventDefault();
        void queueCommand(command);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedRobotId, isSaving, isPlaying, queueCommand]);

  const handleStep = useCallback(async () => {
    if (!simulation || isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/tick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to execute tick");
      }

      const updatedState: SimulationState = data.state;

      setSimulation(updatedState);
      setLastTickResults(data.results);

      const hasCommands = updatedState.robots.some(
        (robot) => robot.queue.length > 0
      );

      if (!hasCommands) {
        setIsPlaying(false);
      }
    } catch (err) {
      setIsPlaying(false);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to execute tick"
      );
    } finally {
      setIsSaving(false);
    }
  }, [simulation, isSaving]);

  useEffect(() => {
    if (!isPlaying || !simulation || isSaving) {
      return;
    }

    const hasCommands = simulation.robots.some(
      (robot) => robot.queue.length > 0
    );

    if (!hasCommands) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleStep();
    }, PLAY_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [isPlaying, simulation, isSaving, handleStep]);

  function handlePlayPause() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (!simulation || isSaving) {
      return;
    }

    const hasCommands = simulation.robots.some(
      (robot) => robot.queue.length > 0
    );

    if (!hasCommands) {
      setError("Queue commands for a robot before pressing Play.");
      return;
    }

    setError("");
    setIsPlaying(true);
  }

  async function handleCellClick(x: number, y: number) {
    if (!simulation || isSaving || isPlaying) {
      return;
    }

    const existingRobot = simulation.robots.find(
      (robot) =>
        robot.position.x === x && robot.position.y === y
    );

    if (existingRobot) {
      setSelectedRobotId(existingRobot.id);
      setError("");
      return;
    }

    const isObstacle = simulation.floor.obstacles.some(
      (obstacle) =>
        obstacle.x === x && obstacle.y === y
    );

    if (editMode === "robots" && isObstacle) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (editMode === "obstacles") {
        const response = await fetch(
          `${API_URL}/api/obstacles`,
          {
            method: isObstacle ? "DELETE" : "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ x, y })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ?? "Unable to update obstacle"
          );
        }

        setSimulation(data.state);
        return;
      }

      const newRobotId = getNextRobotId(simulation.robots);

      const response = await fetch(`${API_URL}/api/robots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: newRobotId,
          x,
          y,
          facing: "NORTH"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to place robot");
      }

      setSimulation(data.state);
      setSelectedRobotId(newRobotId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update cell"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    if (!simulation || isSaving || isPlaying) {
      return;
    }

    const width = Number(floorWidth);
    const height = Number(floorHeight);

    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      width > 20 ||
      height < 1 ||
      height > 20
    ) {
      setError("Floor width and height must be integers from 1 to 20.");
      return;
    }

    const confirmed = window.confirm(
      `Reset to a ${width} × ${height} floor?\n\n` +
      "This permanently clears all robots, obstacles, " +
      "queued commands, tick count, and event history."
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/simulation/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ width, height })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to reset simulation"
        );
      }

      setSimulation(data.state);
      setSelectedRobotId(null);
      setLastTickResults([]);
      setEditMode("robots");

      setFloorWidth(String(width));
      setFloorHeight(String(height));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset simulation"
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!simulation) {
    return (
      <main className="app">
        <h1>Fleet Floor Simulator</h1>
        {error ? (
          <p className="error" role="alert">{error}</p>
        ) : (
          <p>Loading warehouse...</p>
        )}
      </main>
    );
  }

  const { floor, robots, tick } = simulation;

  const selectedRobot = robots.find(
    (robot) => robot.id === selectedRobotId
  );

  const hasQueuedCommands = robots.some(
    (robot) => robot.queue.length > 0
  );

  const cells = [];

  // The top row has the largest Y coordinate.
  for (let y = floor.height - 1; y >= 0; y--) {
    for (let x = 0; x < floor.width; x++) {
      const robot = robots.find(
        (item) =>
          item.position.x === x &&
          item.position.y === y
      );

      const isObstacle = floor.obstacles.some(
        (item) => item.x === x && item.y === y
      );

      const isSelected = robot?.id === selectedRobotId;

      const cellAction = robot
        ? `Select ${robot.id}`
        : editMode === "obstacles"
          ? isObstacle
            ? "Remove obstacle"
            : "Add obstacle"
          : isObstacle
            ? "Obstacle"
            : "Place robot";

      cells.push(
        <button
          key={`${x}-${y}`}
          type="button"
          className={[
            "cell",
            isObstacle ? "obstacle" : "",
            robot ? "robot-cell" : "",
            isSelected ? "selected-cell" : "",
            editMode === "obstacles"
              ? "obstacle-edit-cell"
              : ""
          ].join(" ")}
          title={`${cellAction} at (${x}, ${y})`}
          aria-label={`${cellAction} at ${x}, ${y}`}
          aria-pressed={Boolean(isSelected)}
          disabled={
            isSaving ||
            isPlaying ||
            (editMode === "robots" && isObstacle)
          }
          onClick={() => void handleCellClick(x, y)}
        >
          {robot ? (
            <span className="robot">
              <span className="robot-arrow">
                {robot.facing === "NORTH"
                  ? "↑"
                  : robot.facing === "EAST"
                    ? "→"
                    : robot.facing === "SOUTH"
                      ? "↓"
                      : "←"}
              </span>
              <span>{robot.id}</span>
            </span>
          ) : isObstacle ? (
            <span className="obstacle-symbol">■</span>
          ) : null}
        </button>
      );
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Fleet Floor Simulator</h1>
        <p>Multi-robot warehouse simulation</p>
      </header>

      <section className="dashboard">
        <div className="warehouse-panel">
          <div className="panel-header">
            <h2>Warehouse Floor</h2>
            <span>{floor.width} × {floor.height}</span>
          </div>

          <div
            className="mode-switch"
            role="group"
            aria-label="Grid editing mode"
          >
            <button
              type="button"
              className={
                editMode === "robots" ? "mode-active" : ""
              }
              aria-pressed={editMode === "robots"}
              disabled={isSaving || isPlaying}
              onClick={() => setEditMode("robots")}
            >
              Place Robots
            </button>

            <button
              type="button"
              className={
                editMode === "obstacles" ? "mode-active" : ""
              }
              aria-pressed={editMode === "obstacles"}
              disabled={isSaving || isPlaying}
              onClick={() => setEditMode("obstacles")}
            >
              Edit Obstacles
            </button>
          </div>

          <p className="instruction">
            {editMode === "robots"
              ? "Click an empty cell to place a robot. Click a robot to select it."
              : "Click an empty cell to add an obstacle, or click an obstacle to remove it."}
          </p>

          {error && (
            <p className="error" role="alert">{error}</p>
          )}

          <div
            className="warehouse-grid"
            style={{
              gridTemplateColumns: `repeat(${floor.width}, 1fr)`
            }}
          >
            {cells}
          </div>

          <div className="legend">
            <span>⬜ Empty</span>
            <span>⬛ Obstacle</span>
            <span>🤖 Robot</span>
          </div>

          <section className="simulation-controls">
            <h3>Simulation Controls</h3>

            <div className="playback-buttons">
              <button
                type="button"
                className="step-button"
                disabled={isSaving || isPlaying}
                onClick={() => void handleStep()}
              >
                Step — Next Tick
              </button>

              <button
                type="button"
                className={
                  isPlaying ? "pause-button" : "play-button"
                }
                disabled={
                  !isPlaying && (isSaving || !hasQueuedCommands)
                }
                onClick={handlePlayPause}
              >
                {isPlaying ? "❚❚ Pause" : "▶ Play"}
              </button>
            </div>

            <p className="instruction">
              {isPlaying
                ? "Simulation is running automatically."
                : "Step advances one tick. Play runs until paused or all queues are empty."}
            </p>

            {lastTickResults.length > 0 && (
              <div className="tick-results">
                <h3>Last Tick Results</h3>
                <ul>
                  {lastTickResults.map((result) => (
                    <li key={result.robotId}>
                      <strong>{result.robotId}:</strong>{" "}
                      {result.status}
                      {result.reason
                        ? ` (${result.reason})`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="reset-panel">
            <h3>Reset Floor</h3>
            <p className="instruction">
              Choose new dimensions between 1 and 20.
              Resetting clears the current simulation.
            </p>

            <div className="reset-fields">
              <label>
                Width
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={floorWidth}
                  disabled={isSaving || isPlaying}
                  onChange={(event) =>
                    setFloorWidth(event.target.value)
                  }
                />
              </label>

              <label>
                Height
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={floorHeight}
                  disabled={isSaving || isPlaying}
                  onChange={(event) =>
                    setFloorHeight(event.target.value)
                  }
                />
              </label>

              <button
                type="button"
                className="reset-button"
                disabled={isSaving || isPlaying}
                onClick={() => void handleReset()}
              >
                Reset Simulation
              </button>
            </div>
          </section>

          <EventHistory history={simulation.history} />
        </div>

        <aside className="status-panel">
          <h2>Simulation Status</h2>

          <div className="stat">
            <span>Current tick</span>
            <strong>{tick}</strong>
          </div>

          <div className="stat">
            <span>Robots</span>
            <strong>{robots.length}</strong>
          </div>

          <div className="stat">
            <span>Obstacles</span>
            <strong>{floor.obstacles.length}</strong>
          </div>

          <h3>Robot List</h3>

          {robots.length === 0 ? (
            <p>No robots placed yet.</p>
          ) : (
            <ul className="robot-list">
              {robots.map((robot) => (
                <li
                  key={robot.id}
                  className={
                    robot.id === selectedRobotId
                      ? "selected-robot-list-item"
                      : ""
                  }
                >
                  <strong>{robot.id}</strong>
                  <span>
                    ({robot.position.x}, {robot.position.y})
                    {" · "}
                    {robot.facing}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="selected-robot-panel">
            <h3>Selected Robot</h3>

            {selectedRobot ? (
              <>
                <div className="stat">
                  <span>Robot ID</span>
                  <strong>{selectedRobot.id}</strong>
                </div>

                <div className="stat">
                  <span>Position</span>
                  <strong>
                    ({selectedRobot.position.x},{" "}
                    {selectedRobot.position.y})
                  </strong>
                </div>

                <div className="stat">
                  <span>Facing</span>
                  <strong>{selectedRobot.facing}</strong>
                </div>

                <div className="stat">
                  <span>Queued commands</span>
                  <strong>{selectedRobot.queue.length}</strong>
                </div>

                <h3>Queue Commands</h3>

                <div className="command-controls">
                  <button
                    type="button"
                    disabled={isSaving || isPlaying}
                    onClick={() => void queueCommand("LEFT")}
                  >
                    ← LEFT
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || isPlaying}
                    onClick={() => void queueCommand("MOVE")}
                  >
                    ↑ MOVE
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || isPlaying}
                    onClick={() => void queueCommand("RIGHT")}
                  >
                    → RIGHT
                  </button>
                </div>

                <p className="keyboard-hint">
                  Keyboard: ↑ MOVE · ← LEFT · → RIGHT
                </p>

                <h3>Command Queue</h3>

                {selectedRobot.queue.length === 0 ? (
                  <p>No commands queued.</p>
                ) : (
                  <ol className="command-queue">
                    {selectedRobot.queue.map(
                      (command, index) => (
                        <li key={index}>{command}</li>
                      )
                    )}
                  </ol>
                )}
              </>
            ) : (
              <p>Click a robot on the grid to select it.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;

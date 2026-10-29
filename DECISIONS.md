# Technical Design Decisions

## 1. Architecture

The Fleet Floor Simulator uses a layered architecture separating the React frontend, Express backend, simulation engine, and CLI.

- **React frontend:** Handles user interaction, grid visualization, robot selection, command queueing, and simulation playback.
- **Express backend:** Exposes REST APIs for simulation operations and persists state.
- **Simulation engine:** Implements deterministic movement, collisions, pathfinding, and battery rules.
- **CLI:** Uses the same simulation engine to execute text-based scenarios.
- **SQLite database:** Persists the complete simulation state between application restarts.

This separation allows the simulation rules to be tested independently of the user interface and database.

## 2. State Representation

The simulation state contains:

- Floor dimensions, obstacles, and charging stations.
- Robot IDs, positions, facing directions, queued commands, and battery levels.
- Current simulation tick.
- Event history.

Robot IDs follow the format `R1`, `R2`, and so on.

The coordinate system uses `(0,0)` as the bottom-left cell. Moving NORTH increases Y, while moving EAST increases X.

Floor dimensions are restricted to integers between 1 and 20.

## 3. Simultaneous Tick Processing

A major design decision was to process robot movements simultaneously rather than updating each robot sequentially.

Each tick is processed in phases:

1. Read each robot's next queued command using the positions at the beginning of the tick.
2. Calculate movement intentions.
3. Resolve contested destination cells.
4. Resolve dependencies between moving robots.
5. Apply successful movements simultaneously.
6. Update battery levels and charging.
7. Record the outcome for every robot.

This prevents the order of iteration through the robot array from determining movement results.

### Collision Rules

**Walls and obstacles:** A MOVE outside the floor or into an obstacle is blocked.

**Contested destinations:** If multiple robots attempt to enter the same cell, the lowest numeric robot ID receives priority.

**Two-robot swaps:** Two robots attempting to exchange positions in the same tick are blocked.

**Following chains:** A robot may move into an occupied cell if the occupying robot successfully moves away during that tick.

**Circular movement:** Cycles involving three or more robots are allowed to move simultaneously.

**Blocked commands:** Ordinary MOVE commands are consumed even when blocked.

The engine uses movement intentions and recursive dependency resolution to handle these cases.

## 4. GOTO Pathfinding

GOTO navigation uses breadth-first search (BFS).

BFS was selected because all grid movements have equal cost, making it suitable for finding shortest paths without requiring a more complex algorithm.

The search evaluates directions in this order:

1. NORTH
2. EAST
3. SOUTH
4. WEST

This provides deterministic behavior when multiple shortest routes exist.

Obstacles and other robots' current positions are treated as blocked cells during pathfinding.

The route is recalculated every tick, allowing a robot to adapt when other robots move.

A GOTO command remains at the front of the queue until the robot arrives or its destination is declared unreachable.

If no route exists for three consecutive ticks, the command is removed and reported as `UNREACHABLE`.

GOTO movement changes the robot's facing direction automatically without requiring separate turning ticks.

## 5. Battery and Charging

Each newly placed robot starts with 100 battery units.

Battery consumption is applied after movement resolution:

- Successful MOVE: −1 battery.
- Successful GOTO movement: −1 battery.
- Blocked movement: no consumption.
- LEFT and RIGHT: no consumption.
- Movement with zero battery: blocked with `NO_BATTERY`.

Charging takes place after commands and movement have been processed.

A robot ending a tick on a charger receives 10 battery units, with a maximum of 100.

Charging also occurs while a robot is idle, turning, or blocked.

A robot with zero battery on a charger can regain battery at the end of the tick and attempt movement again on a later tick.

Chargers can share cells with robots but cannot overlap obstacles.

## 6. SQLite Persistence

SQLite was selected because the assessment requires persistent simulation state and the application runs locally.

The backend stores the simulation state as JSON in a SQLite table.

This approach simplifies persistence because the simulation already uses a structured state object.

The database stores robot positions, queued commands, obstacles, chargers, battery levels, tick count, and event history.

### Backward Compatibility

Older saved simulations may not include battery or charger fields.

When loading older records, the application initializes missing robot battery levels to 100 and missing charger collections to empty arrays.

Existing positions, commands, history, and other simulation data are preserved.

## 7. API Design

The Express backend provides endpoints for retrieving simulation state, placing robots, queueing commands, advancing ticks, managing obstacles and chargers, resetting the floor, and queueing GOTO destinations.

The API validates requests before passing them to the simulation engine.

Invalid coordinates, unknown robots, and conflicting placements return appropriate HTTP error responses.

The backend persists successful state changes to SQLite and returns the updated simulation state to React.

## 8. CLI Design

The CLI uses the same engine as the web application to avoid duplicating simulation logic.

It supports floor creation, obstacle placement, robot placement, command queueing, tick execution, charger placement, GOTO navigation, and reporting.

CLI commands are case-insensitive.

Unknown or malformed commands are ignored.

The original `REPORT` format is preserved for compatibility with the required scenarios.

An additional `REPORT BATTERY` command displays battery levels sorted by numeric robot ID.

## 9. Testing Strategy

The project uses automated tests at several levels:

**Engine unit tests:** Validate placement, commands, directions, collisions, simultaneous movement, GOTO pathfinding, battery consumption, and charging.

**Backend integration tests:** Validate REST endpoints, request handling, SQLite persistence, and database migration.

**CLI scenario tests:** Verify expected outputs for the original scenarios and additional advanced scenarios.

**Frontend verification:** Uses TypeScript production builds and manual browser testing for navigation, obstacle editing, GOTO, charging stations, and battery displays.

At the time of writing, 115 engine tests, 49 backend tests, five original CLI scenarios, and six advanced CLI scenarios were passing.

## 10. Tradeoffs and Limitations

**Snapshot persistence:** Storing the entire simulation state as JSON is simple and appropriate for a local simulator, but a larger production system could benefit from normalized database tables or incremental event storage.

**BFS pathfinding:** BFS produces deterministic shortest paths for an unweighted grid, but it does not globally optimize the movement of multiple robots.

**Dynamic obstacles:** GOTO replans every tick using current robot positions instead of predicting every robot's future movement.

**Single simulation:** The backend currently manages one persisted simulation rather than multiple user sessions.

**Local execution:** The project is designed to run locally without cloud infrastructure or authentication.


## Assumptions and Ambiguous Behaviors

### Contradiction in the Battery Example

The assessment includes a battery scenario with a 3×1 floor, a robot starting at (0,0) facing EAST, and three queued MOVE commands. The example expects a final battery of 97.

However, only two moves are possible on this floor. The third MOVE attempts to leave the floor and is blocked.

The specification also states that blocked movements do not consume battery. Therefore, the result consistent with the stated rules is 98, not 97.

I chose to follow the explicit movement and battery-consumption rules rather than the contradictory example output. Blocked MOVE commands are consumed but do not reduce battery.

This behavior is covered by the engine's battery and boundary tests.

Some implementation details required explicit decisions.

### GOTO and Occupied Cells

GOTO treats other robots' current positions as obstacles
during BFS. This means GOTO may wait or choose another route
rather than assuming another robot will move away during
the same tick.

This keeps pathfinding deterministic and follows the
module's requirement to treat occupied cells as walls.

### GOTO with No Battery

A robot with zero battery cannot move, even if a valid
path exists.

The GOTO command remains queued with a NO_BATTERY result
rather than being immediately marked unreachable.

The robot can resume navigation if it receives charge.

### Charging Order

Battery consumption and charging happen within the same
tick, with charging applied after movement resolution.

A robot that moves onto a charger consumes one battery unit
and then gains ten units, capped at 100.

### Chargers and Robots

A charging station can occupy the same cell as a robot
because robots must be able to stand on chargers to recharge.

Chargers and obstacles cannot occupy the same cell.

### Simultaneous Movement

All movement decisions use robot positions from the
beginning of the tick.

Movement intentions are resolved before positions are
updated, so array iteration order does not determine
which robots move.


## 11. Potential Improvements

Future enhancements could include:

- Multiple saved simulations and user sessions.
- Visual route previews.
- Configurable charging rates and robot battery capacities.
- More detailed analytics for robot utilization.
- Automated frontend interaction tests.
- Multi-robot route optimization.

These improvements were left outside the current implementation to keep the solution focused on the assessment requirements.
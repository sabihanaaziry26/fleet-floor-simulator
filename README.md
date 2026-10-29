# Fleet Floor Simulator

A full-stack warehouse robot simulator built with React, TypeScript, Node.js, Express, and SQLite.

The application simulates multiple robots moving across a warehouse floor while handling movement commands, obstacles, simultaneous movement, collisions, automatic pathfinding, battery consumption, and charging stations.

## Selected Depth Modules

I implemented two advanced modules:

### Module A — GOTO Pathfinding

I chose GOTO because it builds on the existing movement engine and introduces an additional algorithmic challenge.

I implemented BFS shortest-path navigation, deterministic direction selection, dynamic replanning, and unreachable destination handling.

### Module B — Battery and Charging

I chose Battery and Charging because it adds resource management to the simulation while using the existing tick-processing model.

I implemented battery consumption, charging stations, empty-battery movement restrictions, and battery reporting.

## Features Not Implemented

The following optional modules were outside my selected scope:

- Module C: Timeline and Fork
- Module D: Multiple Users in Real Time

Potential future improvements include automated frontend interaction tests, live synchronization across browser tabs, and support for multiple independent simulations.

## Features

### Warehouse Simulation

- Configurable warehouse grid, from 1×1 to 20×20.
- Default web grid: 10×8.
- Default CLI grid: 5×5.
- Bottom-left coordinate origin `(0,0)`.
- Robot placement and selection.
- Obstacle placement and removal.
- Four facing directions: NORTH, EAST, SOUTH, WEST.

### Robot Commands

- `MOVE` — move forward one cell.
- `LEFT` — rotate 90 degrees left.
- `RIGHT` — rotate 90 degrees right.
- `GOTO` — automatically navigate toward a destination.

Commands are queued per robot and processed during simulation ticks.

### Simultaneous Movement

All robots process their next queued command during each tick.

The simulation supports:

- Wall and obstacle collision detection.
- Contested-cell resolution using the lowest numeric robot ID.
- Blocking direct two-robot swaps.
- Allowing following chains when the destination becomes available.
- Allowing circular movement involving three or more robots.
- Consuming blocked MOVE commands.
- Recording tick results and event history.

### Automatic GOTO Navigation

- Breadth-first search (BFS) shortest-path navigation.
- Pathfinding tie-breaking order: NORTH, EAST, SOUTH, WEST.
- Other robots' current positions are treated as blocked cells.
- Routes are recalculated every tick.
- Navigation adjusts the robot's facing direction automatically.
- A destination with no available route for three consecutive ticks is marked unreachable.

### Battery and Charging

- Robots begin with 100 battery units.
- Successful movement consumes 1 battery unit.
- Blocked movements and rotations consume no battery.
- Robots with empty batteries cannot move.
- Chargers restore 10 battery units at the end of each tick.
- Battery levels cannot exceed 100.
- Charger locations can be managed through the web interface and CLI.

### Persistence

Simulation state is saved using SQLite, including robot positions, command queues, battery levels, obstacles, chargers, current tick, and event history.

Saved simulations can be restored after restarting the backend. Older simulation data is migrated to support newly added battery and charger fields.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js 24+, Express 5, TypeScript |
| Database | SQLite using `node:sqlite` |
| Simulation engine | TypeScript |
| Pathfinding | Breadth-first search |
| Testing | Vitest, Supertest |
| CLI | TypeScript and tsx |

## Project Structure

```text
fleet-floor-simulator/
├── backend/
│   ├── src/
│   └── tests/
├── cli/
│   └── scenario.ts
├── engine/
│   ├── src/
│   └── tests/
├── frontend/
│   └── src/
├── scenarios/
│   └── expected/
├── scripts/
├── package.json
├── README.md
├── DECISIONS.md
└── AI_USAGE.md
```

The simulation engine contains the core rules and is shared by the backend and CLI. The React frontend communicates with the backend through REST APIs.

## Prerequisites

Install:

- Node.js version 24 or newer.
- npm.
- Git.

## Installation

Clone the repository and open the project folder.

Install dependencies in each package:

```bash
npm install
cd engine
npm install
cd ../backend
npm install
cd ../frontend
npm install
cd ..
```

## Running the Web Application

Start the backend in one terminal:

```bash
cd backend
npm run dev
```

The backend runs at:

http://localhost:3001

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open the local URL displayed by Vite, normally:

http://localhost:5173

### Using the Interface

1. Select **Place Robots** and click an available grid cell to add a robot.
2. Select a robot to view its position, direction, battery, and command queue.
3. Use the command buttons or keyboard arrows to queue movement commands.
4. Use **GOTO Destination** to queue automatic navigation.
5. Select **Edit Obstacles** to add or remove blocked cells.
6. Select **Edit Chargers** to add or remove charging stations.
7. Click **Step — Next Tick** to execute one tick, or **Play** to advance automatically.
8. Review the simulation results and event history.

The Reset Simulation controls create a new floor with the selected dimensions and clear the current simulation.

## Running CLI Scenarios

From the project root:

```bash
npm run scenario -- scenarios/01-following-chain.txt
```

Supported scenario commands include:

```text
FLOOR 5,5
OBSTACLE 3,3
PLACE R1 0,0,EAST
QUEUE R1 MOVE MOVE RIGHT
TICK 3
REPORT
```

Advanced scenario commands include:

```text
CHARGER 2,0
QUEUE R1 GOTO 2,0
REPORT BATTERY
```

CLI commands are case-insensitive. Invalid or malformed lines are ignored.

### Sample Advanced Scenario

```text
FLOOR 5,5
PLACE R1 0,0,EAST
CHARGER 2,0
QUEUE R1 GOTO 2,0
TICK 2
REPORT
REPORT BATTERY
```

Expected output:

```text
R1 2,0,EAST
R1 100
```

The original `REPORT` command displays each robot's ID, position, and facing direction, sorted by numeric robot ID.

`REPORT BATTERY` displays the remaining battery units.

## Testing

### Simulation Engine

```bash
cd engine
npm test
npm run typecheck
```

### Backend

```bash
cd backend
npm test
npm run typecheck
npm run build
```

### Frontend

```bash
cd frontend
npm run build
```

### Original CLI Scenarios

Run from the project root:

```bash
node scripts/verify-scenarios.mjs
```

### Advanced CLI Scenarios

```bash
node scripts/verify-advanced-scenarios.mjs
```

### Root TypeScript Check

```bash
npx tsc --noEmit
```

At the time of documentation, the project passed 115 engine tests, 49 backend tests, five original CLI scenarios, and six advanced CLI scenarios.

## Design Documentation

See `DECISIONS.md` for details about the architecture, tick processing, movement resolution, pathfinding, persistence, and technical tradeoffs.

See `AI_USAGE.md` for documentation of AI assistance during development and how the implementation was reviewed and verified.
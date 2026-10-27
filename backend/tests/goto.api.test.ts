
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import request from "supertest";

import { createApp } from "../src/app.js";
import { SimulationDatabase } from "../src/database.js";
import { SimulationRepository } from "../src/simulationRepository.js";

describe("GOTO API integration", () => {
  let repository: SimulationRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    // Each test uses a fresh database.
    // The real fleet.sqlite file is not touched.
    repository = new SimulationRepository(
      new SimulationDatabase(":memory:")
    );

    app = createApp(repository);
  });

  afterEach(() => {
    repository.close();
  });

  async function placeRobot() {
    return request(app)
      .post("/api/robots")
      .send({
        id: "R1",
        x: 0,
        y: 0,
        facing: "EAST"
      });
  }

  it("queues a valid GOTO destination", async () => {
    const placement = await placeRobot();
    expect(placement.status).toBe(201);

    const response = await request(app)
      .post("/api/robots/R1/goto")
      .send({ x: 3, y: 2 });

    expect(response.status).toBe(200);

    expect(response.body.state.robots[0].queue).toEqual([
      {
        type: "GOTO",
        target: { x: 3, y: 2 },
        blockedTicks: 0
      }
    ]);

    // Queuing must not immediately move the robot.
    expect(response.body.state.robots[0].position).toEqual({
      x: 0,
      y: 0
    });
  });

  it("persists the GOTO command in SQLite", async () => {
    await placeRobot();

    await request(app)
      .post("/api/robots/R1/goto")
      .send({ x: 4, y: 3 });

    const response = await request(app)
      .get("/api/simulation");

    expect(response.status).toBe(200);

    expect(response.body.robots[0].queue[0]).toEqual({
      type: "GOTO",
      target: { x: 4, y: 3 },
      blockedTicks: 0
    });

    expect(
      repository.getState().history.at(-1)?.type
    ).toBe("GOTO_QUEUED");
  });

  it("rejects a destination outside the floor", async () => {
    await placeRobot();

    const response = await request(app)
      .post("/api/robots/R1/goto")
      .send({ x: 25, y: 2 });

    expect(response.status).toBe(409);
    expect(repository.getState().robots[0].queue).toEqual([]);
  });

  it("rejects a destination containing an obstacle", async () => {
    await placeRobot();

    const obstacle = await request(app)
      .post("/api/obstacles")
      .send({ x: 2, y: 2 });

    expect(obstacle.status).toBe(201);

    const response = await request(app)
      .post("/api/robots/R1/goto")
      .send({ x: 2, y: 2 });

    expect(response.status).toBe(409);
    expect(repository.getState().robots[0].queue).toEqual([]);
  });

  it("rejects non-integer destination coordinates", async () => {
    await placeRobot();

    const response = await request(app)
      .post("/api/robots/R1/goto")
      .send({ x: 2.5, y: "three" });

    expect(response.status).toBe(400);
    expect(repository.getState().robots[0].queue).toEqual([]);
  });

  it("returns 404 for an unknown robot", async () => {
    const response = await request(app)
      .post("/api/robots/R99/goto")
      .send({ x: 2, y: 2 });

    expect(response.status).toBe(404);
  });

  it("executes GOTO through the tick API until arrival", async () => {
    await placeRobot();

    const queued = await request(app)
      .post("/api/robots/R1/goto")
      .send({ x: 2, y: 0 });

    expect(queued.status).toBe(200);

    const first = await request(app)
      .post("/api/tick")
      .send({});

    expect(first.status).toBe(200);
    expect(first.body.state.tick).toBe(1);
    expect(first.body.state.robots[0].position).toEqual({
      x: 1,
      y: 0
    });
    expect(first.body.results[0].status).toBe("MOVED");
    expect(first.body.state.robots[0].queue).toHaveLength(1);

    const second = await request(app)
      .post("/api/tick")
      .send({});

    expect(second.status).toBe(200);
    expect(second.body.state.tick).toBe(2);
    expect(second.body.state.robots[0].position).toEqual({
      x: 2,
      y: 0
    });
    expect(second.body.results[0].status).toBe("ARRIVED");
    expect(second.body.state.robots[0].queue).toEqual([]);

    const saved = repository.getState();

    expect(saved.robots[0].position).toEqual({
      x: 2,
      y: 0
    });
    expect(saved.robots[0].queue).toEqual([]);
  });
});

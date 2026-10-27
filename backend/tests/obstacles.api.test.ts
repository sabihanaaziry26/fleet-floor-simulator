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

describe("Obstacle management API", () => {
  let repository: SimulationRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const database = new SimulationDatabase(":memory:");

    repository = new SimulationRepository(database);
    app = createApp(repository);
  });

  afterEach(() => {
    repository.close();
  });

  it("adds an obstacle and saves it to SQLite", async () => {
    const response = await request(app)
      .post("/api/obstacles")
      .send({ x: 2, y: 2 });

    expect(response.status).toBe(201);

    expect(response.body.state.floor.obstacles).toEqual([
      { x: 2, y: 2 }
    ]);

    const saved = repository.getState();

    expect(saved.floor.obstacles).toEqual([
      { x: 2, y: 2 }
    ]);

    expect(saved.history.at(-1)?.type).toBe(
      "OBSTACLE_ADDED"
    );
  });

  it("rejects an obstacle outside the floor", async () => {
    const response = await request(app)
      .post("/api/obstacles")
      .send({ x: 10, y: 0 });

    expect(response.status).toBe(409);

    expect(
      repository.getState().floor.obstacles
    ).toHaveLength(0);
  });

  it("rejects an obstacle on an occupied robot cell", async () => {
    const placement = await request(app)
      .post("/api/robots")
      .send({
        id: "R1",
        x: 1,
        y: 1,
        facing: "NORTH"
      });

    expect(placement.status).toBe(201);

    const response = await request(app)
      .post("/api/obstacles")
      .send({ x: 1, y: 1 });

    expect(response.status).toBe(409);

    expect(
      repository.getState().floor.obstacles
    ).toHaveLength(0);
  });

  it("rejects duplicate obstacles", async () => {
    await request(app)
      .post("/api/obstacles")
      .send({ x: 3, y: 3 });

    const response = await request(app)
      .post("/api/obstacles")
      .send({ x: 3, y: 3 });

    expect(response.status).toBe(409);

    expect(
      repository.getState().floor.obstacles
    ).toHaveLength(1);
  });

  it("removes an existing obstacle", async () => {
    await request(app)
      .post("/api/obstacles")
      .send({ x: 2, y: 2 });

    const response = await request(app)
      .delete("/api/obstacles")
      .send({ x: 2, y: 2 });

    expect(response.status).toBe(200);

    expect(
      repository.getState().floor.obstacles
    ).toEqual([]);

    expect(
      repository.getState().history.at(-1)?.type
    ).toBe("OBSTACLE_REMOVED");
  });

  it("returns 404 when removing a missing obstacle", async () => {
    const response = await request(app)
      .delete("/api/obstacles")
      .send({ x: 4, y: 4 });

    expect(response.status).toBe(404);
  });

  it("rejects malformed obstacle coordinates", async () => {
    const response = await request(app)
      .post("/api/obstacles")
      .send({
        x: "two",
        y: 1
      });

    expect(response.status).toBe(400);

    expect(
      repository.getState().floor.obstacles
    ).toHaveLength(0);
  });

  it("blocks a robot moving into an obstacle", async () => {
    await request(app)
      .post("/api/robots")
      .send({
        id: "R1",
        x: 0,
        y: 0,
        facing: "EAST"
      });

    await request(app)
      .post("/api/obstacles")
      .send({ x: 1, y: 0 });

    await request(app)
      .post("/api/robots/R1/commands")
      .send({
        commands: ["MOVE"]
      });

    const response = await request(app)
      .post("/api/tick")
      .send({});

    expect(response.status).toBe(200);

    expect(response.body.results[0].status).toBe(
      "BLOCKED"
    );

    expect(response.body.results[0].reason).toBe(
      "OBSTACLE"
    );

    expect(
      repository.getState().robots[0].position
    ).toEqual({ x: 0, y: 0 });

    expect(
      repository.getState().robots[0].queue
    ).toEqual([]);
  });
});

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

describe("Charger API integration", () => {
  let repository: SimulationRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = new SimulationRepository(
      new SimulationDatabase(":memory:")
    );

    app = createApp(repository);
  });

  afterEach(() => {
    repository.close();
  });

  it("adds a charger to a valid cell", async () => {
    const response = await request(app)
      .post("/api/chargers")
      .send({ x: 2, y: 3 });

    expect(response.status).toBe(201);
    expect(response.body.state.floor.chargers).toEqual([
      { x: 2, y: 3 }
    ]);
  });

  it("persists chargers in SQLite", async () => {
    await request(app)
      .post("/api/chargers")
      .send({ x: 1, y: 1 });

    const response = await request(app)
      .get("/api/simulation");

    expect(response.status).toBe(200);
    expect(response.body.floor.chargers).toEqual([
      { x: 1, y: 1 }
    ]);
  });

  it("rejects duplicate chargers", async () => {
    await request(app)
      .post("/api/chargers")
      .send({ x: 2, y: 2 });

    const response = await request(app)
      .post("/api/chargers")
      .send({ x: 2, y: 2 });

    expect(response.status).toBe(409);
  });

  it("rejects chargers outside the floor", async () => {
    const response = await request(app)
      .post("/api/chargers")
      .send({ x: 20, y: 20 });

    expect(response.status).toBe(409);
  });

  it("rejects non-integer coordinates", async () => {
    const response = await request(app)
      .post("/api/chargers")
      .send({ x: 1.5, y: 2 });

    expect(response.status).toBe(400);
  });

  it("rejects a charger on an obstacle", async () => {
    const obstacle = await request(app)
      .post("/api/obstacles")
      .send({ x: 3, y: 3 });

    expect(obstacle.status).toBe(201);

    const response = await request(app)
      .post("/api/chargers")
      .send({ x: 3, y: 3 });

    expect(response.status).toBe(409);
  });

  it("allows a charger on a robot's position", async () => {
    const robot = await request(app)
      .post("/api/robots")
      .send({
        id: "R1",
        x: 1,
        y: 1,
        facing: "NORTH"
      });

    expect(robot.status).toBe(201);

    const response = await request(app)
      .post("/api/chargers")
      .send({ x: 1, y: 1 });

    expect(response.status).toBe(201);
    expect(response.body.state.floor.chargers).toContainEqual({
      x: 1,
      y: 1
    });
  });

  it("removes an existing charger", async () => {
    await request(app)
      .post("/api/chargers")
      .send({ x: 2, y: 2 });

    const response = await request(app)
      .delete("/api/chargers")
      .send({ x: 2, y: 2 });

    expect(response.status).toBe(200);
    expect(response.body.state.floor.chargers).toEqual([]);

    const saved = await request(app)
      .get("/api/simulation");

    expect(saved.body.floor.chargers).toEqual([]);
  });

  it("returns 404 when removing a missing charger", async () => {
    const response = await request(app)
      .delete("/api/chargers")
      .send({ x: 4, y: 4 });

    expect(response.status).toBe(404);
  });

  it("prevents obstacles from being added to charger cells", async () => {
    const charger = await request(app)
      .post("/api/chargers")
      .send({ x: 2, y: 2 });

    expect(charger.status).toBe(201);

    const obstacle = await request(app)
      .post("/api/obstacles")
      .send({ x: 2, y: 2 });

    expect(obstacle.status).toBe(409);
  });
});

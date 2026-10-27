import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../src/app.js";
import { SimulationDatabase } from "../src/database.js";
import { SimulationRepository } from "../src/simulationRepository.js";

describe("Simulation reset API", () => {
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

  it("resets to the default 10x8 floor", async () => {
    const response = await request(app)
      .post("/api/simulation/reset")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.state.floor.width).toBe(10);
    expect(response.body.state.floor.height).toBe(8);
    expect(response.body.state.robots).toEqual([]);
    expect(response.body.state.tick).toBe(0);
  });

  it("accepts custom floor dimensions", async () => {
    const response = await request(app)
      .post("/api/simulation/reset")
      .send({ width: 6, height: 4 });

    expect(response.status).toBe(200);
    expect(response.body.state.floor.width).toBe(6);
    expect(response.body.state.floor.height).toBe(4);

    expect(repository.getState().floor.width).toBe(6);
    expect(repository.getState().floor.height).toBe(4);
  });

  it("clears saved robots, obstacles, and history", async () => {
    await request(app).post("/api/robots").send({
      id: "R1",
      x: 0,
      y: 0,
      facing: "EAST"
    });

    await request(app)
      .post("/api/obstacles")
      .send({ x: 2, y: 2 });

    await request(app)
      .post("/api/robots/R1/commands")
      .send({ commands: ["MOVE"] });

    await request(app).post("/api/tick").send({});

    const response = await request(app)
      .post("/api/simulation/reset")
      .send({ width: 5, height: 5 });

    expect(response.status).toBe(200);

    const saved = repository.getState();

    expect(saved.robots).toEqual([]);
    expect(saved.floor.obstacles).toEqual([]);
    expect(saved.history).toEqual([]);
    expect(saved.tick).toBe(0);
  });

  it("rejects invalid dimensions without deleting state", async () => {
    await request(app).post("/api/robots").send({
      id: "R1",
      x: 0,
      y: 0,
      facing: "NORTH"
    });

    const response = await request(app)
      .post("/api/simulation/reset")
      .send({ width: 21, height: 0 });

    expect(response.status).toBe(400);
    expect(repository.getState().robots).toHaveLength(1);
  });

  it("rejects non-integer dimensions", async () => {
    const response = await request(app)
      .post("/api/simulation/reset")
      .send({ width: 5.5, height: 8 });

    expect(response.status).toBe(400);
    expect(repository.getState().floor.width).toBe(10);
  });
});
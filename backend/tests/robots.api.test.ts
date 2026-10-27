import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../src/app.js";
import { SimulationDatabase } from "../src/database.js";
import { SimulationRepository } from "../src/simulationRepository.js";

describe("Robot placement API", () => {
  let database: SimulationDatabase;
  let repository: SimulationRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    // A fresh in-memory SQLite database for each test.
    database = new SimulationDatabase(":memory:");
    repository = new SimulationRepository(database);
    app = createApp(repository);
  });

  afterEach(() => {
    repository.close();
  });

  it("creates a robot and persists its position", async () => {
    const response = await request(app)
      .post("/api/robots")
      .send({
        id: "R1",
        x: 0,
        y: 0,
        facing: "EAST"
      });

    expect(response.status).toBe(201);
    expect(response.body.state.robots).toHaveLength(1);
    expect(response.body.state.robots[0].id).toBe("R1");

    const saved = await request(app).get("/api/simulation");

    expect(saved.status).toBe(200);
    expect(saved.body.robots[0].position).toEqual({
      x: 0,
      y: 0
    });
  });

  it("rejects coordinates outside the floor", async () => {
    const response = await request(app)
      .post("/api/robots")
      .send({
        id: "R1",
        x: 20,
        y: 0,
        facing: "NORTH"
      });

    expect(response.status).toBe(409);

    const saved = repository.getState();
    expect(saved.robots).toHaveLength(0);
  });

  it("rejects duplicate robot IDs", async () => {
    await request(app).post("/api/robots").send({
      id: "R1",
      x: 0,
      y: 0,
      facing: "EAST"
    });

    const duplicate = await request(app)
      .post("/api/robots")
      .send({
        id: "R1",
        x: 2,
        y: 2,
        facing: "NORTH"
      });

    expect(duplicate.status).toBe(409);
    expect(repository.getState().robots).toHaveLength(1);
  });

  it("rejects placement on another robot", async () => {
    await request(app).post("/api/robots").send({
      id: "R1",
      x: 1,
      y: 1,
      facing: "NORTH"
    });

    const response = await request(app)
      .post("/api/robots")
      .send({
        id: "R2",
        x: 1,
        y: 1,
        facing: "EAST"
      });

    expect(response.status).toBe(409);
    expect(repository.getState().robots).toHaveLength(1);
  });

  it("rejects malformed input", async () => {
    const response = await request(app)
      .post("/api/robots")
      .send({
        id: "INVALID",
        x: "hello",
        y: 0,
        facing: "UP"
      });

    expect(response.status).toBe(400);
    expect(repository.getState().robots).toHaveLength(0);
  });

  it("records successful robot placement in history", async () => {
    await request(app).post("/api/robots").send({
      id: "R1",
      x: 0,
      y: 0,
      facing: "EAST"
    });

    const state = repository.getState();

    expect(state.history).toHaveLength(1);
    expect(state.history[0].type).toBe("ROBOT_PLACED");
    expect(state.history[0].robotId).toBe("R1");
  });
});
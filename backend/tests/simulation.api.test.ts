import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../src/app.js";
import { SimulationDatabase } from "../src/database.js";
import { SimulationRepository } from "../src/simulationRepository.js";

describe("Simulation command and tick API", () => {
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

  async function createRobot(
    id = "R1",
    x = 0,
    y = 0,
    facing = "EAST"
  ) {
    return request(app)
      .post("/api/robots")
      .send({ id, x, y, facing });
  }

  it("appends commands to a robot queue in order", async () => {
    await createRobot();

    const response = await request(app)
      .post("/api/robots/R1/commands")
      .send({
        commands: ["MOVE", "RIGHT", "MOVE"]
      });

    expect(response.status).toBe(200);
    expect(response.body.state.robots[0].queue).toEqual([
      "MOVE",
      "RIGHT",
      "MOVE"
    ]);

    const saved = repository.getState();

    expect(saved.robots[0].queue).toEqual([
      "MOVE",
      "RIGHT",
      "MOVE"
    ]);
  });

  it("accepts lowercase command names", async () => {
    await createRobot();

    const response = await request(app)
      .post("/api/robots/R1/commands")
      .send({
        commands: ["move", "left"]
      });

    expect(response.status).toBe(200);
    expect(response.body.state.robots[0].queue).toEqual([
      "MOVE",
      "LEFT"
    ]);
  });

  it("rejects invalid commands without modifying the queue", async () => {
    await createRobot();

    const response = await request(app)
      .post("/api/robots/R1/commands")
      .send({
        commands: ["MOVE", "JUMP"]
      });

    expect(response.status).toBe(400);
    expect(repository.getState().robots[0].queue).toEqual([]);
  });

  it("returns 404 for an unknown robot", async () => {
    const response = await request(app)
      .post("/api/robots/R99/commands")
      .send({
        commands: ["MOVE"]
      });

    expect(response.status).toBe(404);
  });

  it("moves a robot and consumes one command per tick", async () => {
    await createRobot();

    await request(app)
      .post("/api/robots/R1/commands")
      .send({
        commands: ["MOVE", "RIGHT"]
      });

    const response = await request(app)
      .post("/api/tick")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.state.tick).toBe(1);

    expect(response.body.state.robots[0].position).toEqual({
      x: 1,
      y: 0
    });

    expect(response.body.state.robots[0].queue).toEqual([
      "RIGHT"
    ]);

    expect(response.body.results[0].status).toBe("MOVED");
  });

  it("turns a robot on the next tick", async () => {
    await createRobot();

    await request(app)
      .post("/api/robots/R1/commands")
      .send({
        commands: ["MOVE", "RIGHT"]
      });

    await request(app).post("/api/tick").send({});

    const response = await request(app)
      .post("/api/tick")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.state.tick).toBe(2);
    expect(response.body.state.robots[0].facing).toBe("SOUTH");
    expect(response.body.state.robots[0].queue).toEqual([]);
    expect(response.body.results[0].status).toBe("TURNED");
  });

  it("consumes a blocked MOVE and records the reason", async () => {
    await createRobot("R1", 9, 0, "EAST");

    await request(app)
      .post("/api/robots/R1/commands")
      .send({
        commands: ["MOVE"]
      });

    const response = await request(app)
      .post("/api/tick")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.results[0].status).toBe("BLOCKED");
    expect(response.body.results[0].reason).toBe("WALL");

    expect(response.body.state.robots[0].position).toEqual({
      x: 9,
      y: 0
    });

    expect(response.body.state.robots[0].queue).toEqual([]);
  });

  it("executes simultaneous movement for a following chain", async () => {
    await createRobot("R1", 0, 0, "EAST");
    await createRobot("R2", 1, 0, "EAST");
    await createRobot("R3", 2, 0, "EAST");

    for (const id of ["R1", "R2", "R3"]) {
      await request(app)
        .post(`/api/robots/${id}/commands`)
        .send({
          commands: ["MOVE"]
        });
    }

    const response = await request(app)
      .post("/api/tick")
      .send({});

    expect(response.status).toBe(200);

    expect(
      response.body.state.robots.map(
        (robot: { position: { x: number } }) =>
          robot.position.x
      )
    ).toEqual([1, 2, 3]);

    expect(
      response.body.results.every(
        (result: { status: string }) =>
          result.status === "MOVED"
      )
    ).toBe(true);
  });

  it("persists tick results and event history", async () => {
    await createRobot();

    await request(app)
      .post("/api/robots/R1/commands")
      .send({
        commands: ["MOVE"]
      });

    await request(app).post("/api/tick").send({});

    const saved = repository.getState();

    expect(saved.tick).toBe(1);
    expect(saved.robots[0].position).toEqual({
      x: 1,
      y: 0
    });

    expect(saved.history.at(-1)?.type).toBe("TICK_RESULT");
    expect(saved.history.at(-1)?.robotId).toBe("R1");
  });
});
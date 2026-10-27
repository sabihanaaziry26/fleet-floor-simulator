import { describe, expect, it } from "vitest";
import { createFloor, isInsideFloor } from "./floor.js";

describe("Floor creation", () => {
  it("creates the default 10x8 floor", () => {
    const floor = createFloor();

    expect(floor.width).toBe(10);
    expect(floor.height).toBe(8);
    expect(floor.obstacles).toEqual([]);
  });

  it("creates a floor with custom dimensions", () => {
    const floor = createFloor(5, 5);

    expect(floor.width).toBe(5);
    expect(floor.height).toBe(5);
  });

  it("accepts the minimum floor size", () => {
    expect(createFloor(1, 1).width).toBe(1);
  });

  it("accepts the maximum floor size", () => {
    expect(createFloor(20, 20).height).toBe(20);
  });

  it("rejects invalid dimensions", () => {
    expect(() => createFloor(0, 5)).toThrow();
    expect(() => createFloor(21, 5)).toThrow();
    expect(() => createFloor(5, -1)).toThrow();
    expect(() => createFloor(2.5, 5)).toThrow();
  });
});

describe("Floor coordinate validation", () => {
  const floor = createFloor(5, 5);

  it("accepts the bottom-left corner", () => {
    expect(isInsideFloor(floor, { x: 0, y: 0 })).toBe(true);
  });

  it("accepts the top-right corner", () => {
    expect(isInsideFloor(floor, { x: 4, y: 4 })).toBe(true);
  });

  it("rejects coordinates outside the floor", () => {
    expect(isInsideFloor(floor, { x: 5, y: 0 })).toBe(false);
    expect(isInsideFloor(floor, { x: -1, y: 2 })).toBe(false);
    expect(isInsideFloor(floor, { x: 2, y: 5 })).toBe(false);
  });

  it("rejects fractional coordinates", () => {
    expect(isInsideFloor(floor, { x: 1.5, y: 2 })).toBe(false);
  });
});
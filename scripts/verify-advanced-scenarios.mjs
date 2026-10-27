
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = resolve(import.meta.dirname, "..");

const cases = [
  {
    name: "GOTO navigation and charging",
    source: `
FLOOR 5,5
PLACE R1 0,0,EAST
CHARGER 2,0
QUEUE R1 GOTO 2,0
TICK 2
REPORT
REPORT BATTERY
`,
    expected: "R1 2,0,EAST\nR1 BATTERY 100"
  },
  {
    name: "Battery decreases after movement",
    source: `
FLOOR 5,5
PLACE R1 0,0,EAST
QUEUE R1 MOVE MOVE
TICK 2
REPORT BATTERY
`,
    expected: "R1 BATTERY 98"
  },
  {
    name: "Blocked movement does not consume battery",
    source: `
FLOOR 5,5
PLACE R1 0,0,WEST
QUEUE R1 MOVE
TICK
REPORT BATTERY
`,
    expected: "R1 BATTERY 100"
  },
  {
    name: "Battery report sorts robot IDs numerically",
    source: `
FLOOR 5,5
PLACE R10 1,1,NORTH
PLACE R2 2,2,EAST
PLACE R1 0,0,SOUTH
REPORT BATTERY
`,
    expected:
      "R1 BATTERY 100\nR2 BATTERY 100\nR10 BATTERY 100"
  },
  {
    name: "Invalid charger coordinates are ignored",
    source: `
FLOOR 5,5
CHARGER 9,9
CHARGER BAD
PLACE R1 0,0,EAST
REPORT BATTERY
`,
    expected: "R1 BATTERY 100"
  },
  {
    name: "Case-insensitive advanced commands",
    source: `
floor 5,5
place r1 0,0,east
charger 1,0
queue r1 goto 1,0
tick
report
report battery
`,
    expected: "R1 1,0,EAST\nR1 BATTERY 100"
  }
];

const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "fleet-cli-test-")
);

let passed = 0;

try {
  for (const testCase of cases) {
    const scenarioPath = join(
      temporaryDirectory,
      `${passed}.txt`
    );

    writeFileSync(
      scenarioPath,
      testCase.source
    );

    const output = execFileSync(
      "node",
      [
        "--import",
        "tsx",
        resolve(root, "cli/scenario.ts"),
        scenarioPath
      ],
      {
        cwd: root,
        encoding: "utf8"
      }
    ).trim();

    try {
      assert.equal(output, testCase.expected);
      console.log(`PASS: ${testCase.name}`);
      passed++;
    } catch {
      console.error(`FAIL: ${testCase.name}`);
      console.error("Expected:");
      console.error(testCase.expected);
      console.error("Received:");
      console.error(output);
      process.exitCode = 1;
    }
  }
} finally {
  rmSync(temporaryDirectory, {
    recursive: true,
    force: true
  });
}

console.log(`\n${passed}/${cases.length} advanced scenarios passed`);

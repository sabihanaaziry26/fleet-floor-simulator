import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const scenarios = [
  "01-following-chain",
  "02-head-on-swap",
  "03-contested-cell",
  "04-circular-rotation",
  "05-different-queues"
];

let failures = 0;

for (const name of scenarios) {
  const scenarioPath = resolve(root, "scenarios", `${name}.txt`);
  const expectedPath = resolve(
    root,
    "scenarios",
    "expected",
    `${name}.txt`
  );

  const expected = readFileSync(expectedPath, "utf8");
  let actual;

  try {
    actual = execFileSync(
      process.execPath,
      [
        resolve(root, "node_modules/tsx/dist/cli.mjs"),
        resolve(root, "cli/scenario.ts"),
        scenarioPath
      ],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 15000
      }
    );
  } catch (error) {
    console.error(`FAIL: ${name} - runner failed`);
    console.error(error.message);
    failures++;
    continue;
  }

  if (actual === expected) {
    console.log(`PASS: ${name}`);
  } else {
    failures++;
    console.error(`FAIL: ${name}`);
    console.error("Expected:", JSON.stringify(expected));
    console.error("Actual:  ", JSON.stringify(actual));
  }
}

console.log(
  `\n${scenarios.length - failures}/${scenarios.length} scenarios passed`
);

if (failures > 0) {
  process.exitCode = 1;
}
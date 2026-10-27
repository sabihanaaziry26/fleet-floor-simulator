# AI Usage

## Tool Used

I used OpenAI ChatGPT as a development assistant throughout this project.

My approach was to work incrementally, use AI to help explore implementations and generate code suggestions, and verify the results through local testing and debugging.

## How I Used AI

**Architecture and implementation**

I used ChatGPT to help structure the project into a React frontend, Express backend, reusable TypeScript simulation engine, and CLI.

I also used it to generate and refine implementation code for robot movement, collision handling, BFS pathfinding, battery management, SQLite persistence, and REST APIs.

**Testing and debugging**

I used AI to suggest unit tests, integration tests, edge cases, and troubleshooting steps. I ran the tests locally in VS Code, reviewed failures, checked the relevant source files, and made corrections before proceeding.

**Documentation**

I used AI to help organize and draft the README, technical decisions, and AI usage documentation.

## Examples of Reviewing and Correcting AI Output

### 1. Incorrect function usage in battery tests

ChatGPT initially generated tests using `queueCommand()`, but the actual engine exported `queueCommands()`.

After running the tests, I identified the failure and checked `commands.ts`. A second attempt also incorrectly passed a string instead of an array.

I corrected the calls to use the actual function signature:

`queueCommands(state, "R1", ["MOVE"])`

I then reran the tests to verify the fix.

### 2. React component integration

During frontend integration, TypeScript identified an unused `EventHistory` import.

Instead of removing the feature, I restored the component in the interface and reran the production build.

This helped preserve existing functionality while integrating new features.

## My Verification Process

I tested the implementation incrementally rather than relying only on AI-generated explanations.

My verification included:

- Running engine unit tests after implementing simulation rules.
- Running backend integration tests for REST APIs and SQLite persistence.
- Executing the required CLI scenarios and additional scenarios.
- Checking TypeScript compilation and production builds.
- Manually testing robot movement, GOTO navigation, charging stations, and battery updates in the browser.
- Saving implementation milestones using Git commits.

At the time of writing, the project passed 115 engine tests, 49 backend tests, five original CLI scenarios, and six additional CLI scenarios.

## Engineering Judgment and Ownership

AI was useful for accelerating implementation and identifying possible approaches, but I did not assume its suggestions were correct.

I worked through the project in stages, inspected error messages, reviewed relevant source code, verified changes, and corrected issues when the implementation or tests did not behave as expected.

ChatGPT contributed substantial code and test drafts. I used local execution, testing, and iterative review to evaluate those contributions.

I recognize that passing tests does not guarantee complete correctness, and I am responsible for understanding, explaining, debugging, and modifying the submitted implementation.
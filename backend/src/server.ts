import { createApp } from "./app.js";
import { SimulationRepository } from "./simulationRepository.js";

const PORT = 3001;

const repository = new SimulationRepository();
const app = createApp(repository);

app.listen(PORT, () => {
  console.log(
    `Fleet Floor Simulator API running at http://localhost:${PORT}`
  );
});
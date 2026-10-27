import { app } from "./app.js";

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Fleet Floor Simulator API running at http://localhost:${PORT}`);
});
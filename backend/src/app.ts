import express from "express";
import cors from "cors";

export const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    application: "Fleet Floor Simulator",
    message: "Backend API is running"
  });
});

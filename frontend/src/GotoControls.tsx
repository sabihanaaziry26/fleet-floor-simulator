
import { useState } from "react";
import "./GotoControls.css";

interface GotoControlsProps {
  robotId: string;
  floorWidth: number;
  floorHeight: number;
  disabled: boolean;
  onQueued: () => Promise<void>;
}

const API_URL = "http://localhost:3001";

function GotoControls({
  robotId,
  floorWidth,
  floorHeight,
  disabled,
  onQueued
}: GotoControlsProps) {
  const [targetX, setTargetX] = useState("0");
  const [targetY, setTargetY] = useState("0");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleQueueGoto() {
    if (disabled || isSubmitting) {
      return;
    }

    const x = Number(targetX);
    const y = Number(targetY);

    if (
      targetX.trim() === "" ||
      targetY.trim() === "" ||
      !Number.isSafeInteger(x) ||
      !Number.isSafeInteger(y) ||
      x < 0 ||
      x >= floorWidth ||
      y < 0 ||
      y >= floorHeight
    ) {
      setError("Enter valid destination coordinates.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/robots/${robotId}/goto`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ x, y })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to queue GOTO"
        );
      }

      await onQueued();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to queue GOTO"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="goto-controls">
      <h3>GOTO Destination</h3>

      <p className="goto-description">
        Enter target coordinates to queue automatic navigation.
      </p>

      <div className="goto-fields">
        <label>
          X
          <input
            type="number"
            min="0"
            max={floorWidth - 1}
            step="1"
            value={targetX}
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setTargetX(event.target.value)
            }
          />
        </label>

        <label>
          Y
          <input
            type="number"
            min="0"
            max={floorHeight - 1}
            step="1"
            value={targetY}
            disabled={disabled || isSubmitting}
            onChange={(event) =>
              setTargetY(event.target.value)
            }
          />
        </label>
      </div>

      <button
        type="button"
        className="goto-button"
        disabled={disabled || isSubmitting}
        onClick={() => void handleQueueGoto()}
      >
        {isSubmitting ? "Queuing..." : "Queue GOTO"}
      </button>

      {error && (
        <p className="goto-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default GotoControls;

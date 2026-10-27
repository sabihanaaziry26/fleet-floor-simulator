
import type { SimulationEvent } from "./types";
import "./EventHistory.css";

interface EventHistoryProps {
  history: SimulationEvent[];
}

function EventHistory({ history }: EventHistoryProps) {
  // Display the newest event first without changing saved history.
  const newestFirst = [...history].reverse();

  return (
    <section className="event-history-panel">
      <div className="event-history-header">
        <h3>Event History</h3>
        <span>{history.length} events</span>
      </div>

      {history.length === 0 ? (
        <p className="event-history-empty">
          No events yet. Place a robot, edit an obstacle, or
          execute a tick to start recording events.
        </p>
      ) : (
        <ol className="event-history-list">
          {newestFirst.map((event, index) => (
            <li
              key={history.length - 1 - index}
              className="event-history-item"
            >
              <div className="event-history-meta">
                <span>Tick {event.tick}</span>
                <strong>{event.type}</strong>
              </div>

              <p>{event.message}</p>

              {event.robotId && (
                <span className="event-history-robot">
                  Robot: {event.robotId}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default EventHistory;

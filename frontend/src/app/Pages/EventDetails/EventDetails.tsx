import { createEffect, onMount } from "solid-js";
import { useWebSocket } from "../../context/web_socket";
import { selectedEvent } from "../../context/selectedEvent";

export default function EventDetails() {
  const event = selectedEvent();
  const { connect, isConnected } = useWebSocket();

  onMount(() => {
    connect();
  });

  createEffect(async () => {
    if (!isConnected()) {
      return;
    }
  });

  return (
    <div>
      <h1>Event Details</h1>
      {isConnected() ? (
        <p>✅ Conectado al WebSocket</p>
      ) : (
        <p>⏳ Conectando al WebSocket...</p>
      )}

      {event ? (
        <pre>{JSON.stringify(event, null, 2)}</pre>
      ) : (
        <p>No se encontró evento seleccionado</p>
      )}
    </div>
  );
}

import { createSignal } from "solid-js";
import type { PersonEvents } from "../../domain/personEvents";

const [selectedEvent, setSelectedEvent] = createSignal<PersonEvents | null>(
  null,
);

export { selectedEvent, setSelectedEvent };

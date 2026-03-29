import { createSignal } from "solid-js";
import type { PersonEvents } from "../../domain/personEvents";

const [selectedEvent, setSelectedEvent] = createSignal<PersonEvents | null>(
  null,
);
const [selectedPerson, setSelectedPerson] = createSignal<string | null>(null);

export { selectedEvent, setSelectedEvent, selectedPerson, setSelectedPerson };

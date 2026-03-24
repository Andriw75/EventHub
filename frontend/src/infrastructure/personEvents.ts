import type { PersonEvents } from "../domain/personEvents";
import { handleResponse } from "./utils";

const API_PERSON_EVENTS = `${import.meta.env.VITE_API_URL}/events`;

export function fetchPerson(name: string) {
  return handleResponse<PersonEvents[]>(
    `${API_PERSON_EVENTS}/?nombre_usuario=${name}`,
  );
}

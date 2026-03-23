import type { PersonData } from "../domain/personEvents";
const API_PERSON_EVENTS = `${import.meta.env.VITE_API_URL}/events`;

export async function fetchPerson(name: string): Promise<PersonData | null> {
  try {
    const res = await fetch(`${API_PERSON_EVENTS}/?name=${name}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

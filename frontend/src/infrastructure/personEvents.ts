import { handleResponse, buildQuery, toIso } from "./utils";
import type {
  PersonEvents,
  RifaCreate,
  RifaUpdate,
  SubastaCreate,
  SubastaUpdate,
  VentaLimitadaCreate,
  VentaLimitadaUpdate,
} from "../domain/personEvents";

const API_EVENTS = `${import.meta.env.VITE_API_URL}/events`;

export function fetchPerson(name: string, offset = 0) {
  const query = buildQuery({
    user_name: name,
    offset,
  });

  return handleResponse<PersonEvents[]>(`${API_EVENTS}/?${query}`);
}

export function fetchPersonCount(name: string) {
  const query = buildQuery({
    user_name: name,
  });

  return handleResponse<number>(`${API_EVENTS}/count?${query}`);
}

export function createRifa(data: RifaCreate) {
  return handleResponse<PersonEvents>(`${API_EVENTS}/rifa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      fecha_inicio: toIso(data.fecha_inicio),
      fecha_fin: toIso(data.fecha_fin),
    }),
  });
}

export function createSubasta(data: SubastaCreate) {
  return handleResponse<PersonEvents>(`${API_EVENTS}/subasta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      fecha_inicio: toIso(data.fecha_inicio),
      fecha_fin: toIso(data.fecha_fin),
    }),
  });
}

export function createVentaLimitada(data: VentaLimitadaCreate) {
  return handleResponse<PersonEvents>(`${API_EVENTS}/venta-limitada`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      fecha_inicio: toIso(data.fecha_inicio),
      fecha_fin: toIso(data.fecha_fin),
    }),
  });
}

export function updateRifa(eventId: number, data: RifaUpdate) {
  return handleResponse<PersonEvents>(`${API_EVENTS}/rifa/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      fecha_inicio: toIso(data.fecha_inicio),
      fecha_fin: toIso(data.fecha_fin),
    }),
  });
}

export function updateSubasta(eventId: number, data: SubastaUpdate) {
  return handleResponse<PersonEvents>(`${API_EVENTS}/subasta/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      fecha_inicio: toIso(data.fecha_inicio),
      fecha_fin: toIso(data.fecha_fin),
    }),
  });
}

export function updateVentaLimitada(
  eventId: number,
  data: VentaLimitadaUpdate,
) {
  return handleResponse<PersonEvents>(
    `${API_EVENTS}/venta-limitada/${eventId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        fecha_inicio: toIso(data.fecha_inicio),
        fecha_fin: toIso(data.fecha_fin),
      }),
    },
  );
}

export function deleteEvent(eventId: number) {
  return handleResponse<{ detail: string }>(`${API_EVENTS}/${eventId}`, {
    method: "DELETE",
  });
}

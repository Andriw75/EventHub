import { useParams, useNavigate } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import { fetchPerson } from "../../../infrastructure/personEvents";
import styles from "./PersonHome.module.css";

export default function PersonHome() {
  const params = useParams();
  const navigate = useNavigate();

  const [personData] = createResource(
    () => params.person,
    (person) => fetchPerson(person, 0),
  );

  // helpers
  const events = () => personData()?.data ?? [];
  const error = () => personData()?.error;

  function formatDate(date: string | null) {
    if (!date) return "Sin fecha";
    return new Date(date).toLocaleDateString();
  }

  return (
    <div class={styles.container}>
      <Show when={personData.loading}>
        <p class={styles.loading}>Cargando eventos...</p>
      </Show>

      <Show when={error()}>
        <p class={styles.error}>
          Error: {error()?.detail || "Error al cargar"}
        </p>
      </Show>

      <Show when={events().length > 0}>
        <h1 class={styles.title}>Eventos de {params.person}</h1>

        <ul class={styles.list}>
          <For each={events()}>
            {(ev) => (
              <li class={styles.card}>
                <button
                  class={styles.button}
                  onClick={
                    () => navigate(`/${params.person}/${ev.id}`) // 🔥 mejor usar id, no nombre
                  }
                >
                  <h2 class={styles.eventTitle}>{ev.nombre}</h2>

                  <p class={styles.meta}>Tipo: {ev.tipo}</p>

                  <p class={styles.meta}>Estado: {ev.estado}</p>

                  <p class={styles.date}>
                    {formatDate(ev.fecha_inicio)} - {formatDate(ev.fecha_fin)}
                  </p>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show when={!personData.loading && !error() && events().length === 0}>
        <p class={styles.empty}>No hay eventos disponibles</p>
      </Show>
    </div>
  );
}

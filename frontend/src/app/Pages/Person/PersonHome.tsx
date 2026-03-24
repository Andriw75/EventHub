import { useParams, useNavigate } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import { fetchPerson } from "../../../infrastructure/personEvents";
import styles from "./PersonHome.module.css";

export default function PersonHome() {
  const params = useParams();
  const navigate = useNavigate();

  const [personData] = createResource(() => params.person, fetchPerson);

  const events = () => personData()?.data;

  return (
    <div class={styles.container}>
      <Show when={personData.loading}>
        <p class={styles.loading}>Cargando eventos...</p>
      </Show>

      <Show when={personData()?.error}>
        {(err) => (
          <p class={styles.error}>Error: {err().detail || "Error al cargar"}</p>
        )}
      </Show>

      <Show when={events()}>
        {(evs) => (
          <>
            <h1 class={styles.title}>Eventos de {params.person}</h1>

            <ul class={styles.list}>
              <For each={evs()}>
                {(ev) => (
                  <li class={styles.card}>
                    <button
                      class={styles.button}
                      onClick={() => navigate(`/${params.person}/${ev.nombre}`)}
                    >
                      <h2 class={styles.eventTitle}>{ev.nombre}</h2>

                      <p class={styles.meta}>Tipo: {ev.tipo}</p>

                      <p class={styles.meta}>Estado: {ev.estado}</p>

                      <p class={styles.date}>
                        {new Date(ev.fecha_inicio).toLocaleDateString()} -{" "}
                        {new Date(ev.fecha_fin).toLocaleDateString()}
                      </p>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </>
        )}
      </Show>

      <Show
        when={!personData.loading && !personData()?.error && !events()?.length}
      >
        <p class={styles.empty}>No hay eventos disponibles</p>
      </Show>
    </div>
  );
}

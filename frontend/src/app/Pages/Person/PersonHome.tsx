import { useParams, useNavigate } from "@solidjs/router";
import { createResource, createSignal, createMemo, For, Show, on } from "solid-js";
import { fetchPerson, fetchPersonCount } from "../../../infrastructure/personEvents";
import Pagination from "../../common/components/Pagination";
import styles from "./PersonHome.module.css";
import type { ApiResponse } from "../../../domain/utils";
import type { PersonEvents } from "../../../domain/personEvents";

export default function PersonHome() {
  const params = useParams<{ person?: string }>();
  const navigate = useNavigate();

  const [page, setPage] = createSignal(1);
  const PAGE_SIZE = 15;

  const [countData] = createResource(
    () => params.person,
    async (person) => {
      if (!person) return { data: 0, error: null } as ApiResponse<number>;
      return await fetchPersonCount(person);
    }
  );

  const [personData] = createResource(
    () => [params.person, page()],
    async ([person, currentPage = 1]) => {
      if (!person) return { data: [], error: null } as ApiResponse<PersonEvents[]>;
      const offset = (Number(currentPage) - 1) * PAGE_SIZE;
      return await fetchPerson(String(person), offset);
    }
  );

  const events = () => personData()?.data ?? [];
  const error = () => personData()?.error;
  const totalCount = () => countData()?.data ?? 0;

  const totalPages = createMemo(() => {
    const total = totalCount();
    return total ? Math.ceil(total / PAGE_SIZE) : 0;
  });

  function formatDate(date: string | null) {
    if (!date) return "Sin fecha";
    return new Date(date).toLocaleDateString();
  }

  if (!params.person) {
    return <p class={styles.empty}>Persona no encontrada</p>;
  }

  // ✅ Estado de carga de la página
  const [isLoadingPage, setIsLoadingPage] = createSignal(false);
  // Actualizamos isLoadingPage automáticamente cuando cambie page o personData.loading
  on(page, () => setIsLoadingPage(true));
  on(personData, () => {
    if (!personData.loading) setIsLoadingPage(false);
  });

  function handlePageChange(p: number) {
    setPage(p); // el efecto de arriba se encargará de activar isLoadingPage
  }

  return (
    <div class={styles.container}>
      {/* Estado de carga */}
      <Show when={personData.loading || isLoadingPage()}>
        <div class={styles.loading}>
          <p>Cargando eventos...</p>
          <ul class={styles.list}>
            {Array.from({ length: PAGE_SIZE }).map((_, __) => (
              <li
                class={styles.card}
                style={{ background: "#f5f5f5", height: "80px" }}
              ></li>
            ))}
          </ul>
        </div>
      </Show>

      {/* Error */}
      <Show when={error()}>
        <p class={styles.error}>
          Error: {error()?.detail || "Error al cargar"}
        </p>
      </Show>

      {/* Lista de eventos */}
      <Show when={events().length > 0}>
        <h1 class={styles.title}>Eventos de {params.person}</h1>

        <ul class={styles.list}>
          <For each={events()}>
            {(ev) => {
              const [expanded, setExpanded] = createSignal(false);
              return (
                <li class={styles.card}>
                  <button
                    class={styles.button}
                    onClick={() =>
                      navigate(`/${params.person}/${String(ev.id)}`)
                    }
                  >
                    <h2 class={styles.eventTitle}>{ev.nombre}</h2>
                    <p class={styles.meta}>Tipo: {ev.tipo}</p>
                    <p class={styles.meta}>Estado: {ev.estado}</p>
                    <p class={styles.date}>
                      {formatDate(ev.fecha_inicio)} - {formatDate(ev.fecha_fin)}
                    </p>

                    {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                      <>
                        <button
                          type="button"
                          class={styles.expandButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded());
                          }}
                        >
                          {expanded() ? "Ocultar detalles" : "Mostrar detalles"}
                        </button>

                        <Show when={expanded()}>
                          <table class={styles.metadataTable}>
                            <thead>
                              <tr>
                                <th>Clave</th>
                                <th>Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(ev.metadata).map(([key, value]) => (
                                <tr>
                                  <td>{key}</td>
                                  <td>{JSON.stringify(value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Show>
                      </>
                    )}
                  </button>
                </li>
              );
            }}
          </For>
        </ul>

        <Pagination
          currentPage={page()}
          totalPages={totalPages()}
          onPageChange={handlePageChange}
        />
      </Show>

      {/* Sin eventos */}
      <Show when={!personData.loading && !error() && events().length === 0}>
        <p class={styles.empty}>No hay eventos disponibles</p>
      </Show>
    </div>
  );
}
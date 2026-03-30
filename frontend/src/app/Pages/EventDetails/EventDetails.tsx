import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useWebSocket } from "../../context/web_socket";
import { selectedEvent, selectedPerson } from "../../context/selectedEvent";
import type {
  EventFullOut,
  RifaOut,
  SubastaOut,
} from "../../../domain/personEvents";
import styles from "./EventDetails.module.css";
import { useNavigate } from "@solidjs/router";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatState(state?: string) {
  switch (state) {
    case "Proximo":
      return "Próximo";
    case "En_curso":
      return "En curso";
    case "Finalizado":
      return "Finalizado";
    default:
      return state ?? "Sin estado";
  }
}

function getStateClass(state?: string) {
  switch (state) {
    case "Proximo":
      return styles.stateProximo;
    case "En_curso":
      return styles.stateEnCurso;
    case "Finalizado":
      return styles.stateFinalizado;
    default:
      return styles.stateNeutral;
  }
}

function isRifa(event: EventFullOut | null): event is RifaOut {
  return !!event && event.tipo === "rifa";
}

function isSubasta(event: EventFullOut | null): event is SubastaOut {
  return !!event && event.tipo === "subasta";
}

function buildRange(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min > max) return [];

  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

export default function EventDetails() {
  const currentEvent = createMemo(() => selectedEvent());
  const navigate = useNavigate();

  const { connect, disconnect, isConnected, sendMessage, addMessageListener } =
    useWebSocket();

  const [eventData, setEventData] = createSignal<EventFullOut | null>(null);
  const [subscribedEventId, setSubscribedEventId] = createSignal<number | null>(
    null,
  );

  const rifaData = createMemo(() => {
    const data = eventData();
    return isRifa(data) ? data : null;
  });

  const subastaData = createMemo(() => {
    const data = eventData();
    return isSubasta(data) ? data : null;
  });

  const allNumbers = createMemo(() => {
    const rifa = rifaData();
    if (!rifa) return [];
    return buildRange(rifa.numero_inicio, rifa.numero_fin);
  });

  const activeNumbers = createMemo(() => {
    const rifa = rifaData();
    if (!rifa) return new Set<number>();
    return new Set(rifa.numeros_reservados ?? []);
  });

  const metadataEntries = createMemo(() =>
    Object.entries(eventData()?.metadata ?? {}).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  );

  onMount(() => {
    connect();
  });

  createEffect(() => {
    const currentId = currentEvent()?.id;

    setEventData(null);
    setSubscribedEventId(null);

    if (!currentId) return;

    const unsubscribe = addMessageListener((msg) => {
      if (msg.event === "event_data" && msg.data?.id === currentId) {
        setEventData(msg.data as EventFullOut);
      }

      if (msg.event === "event_deleted") {
        if (currentId) {
          // @ts-ignore
          const _ = alert(msg.message);
          goBackToUser();
        }
      }
    });

    onCleanup(() => {
      unsubscribe?.();
    });
  });

  createEffect(() => {
    const currentId = currentEvent()?.id;

    if (!isConnected() || !currentId) return;
    if (subscribedEventId() === currentId) return;

    sendMessage({
      event: "suscribe_event",
      data: { event_id: currentId },
    });

    setSubscribedEventId(currentId);
  });

  createEffect(() => {
    if (!isConnected()) {
      setSubscribedEventId(null);
    }
  });

  onCleanup(() => {
    disconnect();
  });

  const connectionText = createMemo(() => {
    if (!currentEvent()?.id)
      return "Selecciona un evento para ver sus detalles.";
    if (!isConnected()) return "Conectando al WebSocket...";
    if (!eventData()) return "Conectado. Esperando datos del evento...";
    return "Datos cargados correctamente.";
  });

  const connectionClass = createMemo(() => {
    if (!currentEvent()?.id) return styles.statusNeutral;
    if (!isConnected()) return styles.statusWarning;
    if (!eventData()) return styles.statusWarning;
    return styles.statusOk;
  });

  const goBackToUser = () => {
    const person = selectedPerson();
    if (!person) return;
    navigate(`/${person}`);
  };

  return (
    <section class={styles.wrapper}>
      <button class={styles.backButton} onClick={goBackToUser}>
        ← Volver
      </button>

      <header class={styles.header}>
        <div>
          <p class={styles.kicker}>Detalle del evento</p>
          <h1 class={styles.title}>
            {eventData()?.nombre ??
              currentEvent()?.nombre ??
              "Sin evento seleccionado"}
          </h1>
          <p class={styles.subtitle}>{connectionText()}</p>
        </div>

        <div class={`${styles.connectionPill} ${connectionClass()}`}>
          {isConnected() ? "Conectado" : "Conectando"}
        </div>
      </header>

      <Show
        when={currentEvent()?.id}
        fallback={
          <div class={styles.emptyState}>
            Selecciona un evento para mostrar sus datos.
          </div>
        }
      >
        <Show
          when={eventData()}
          fallback={
            <div class={styles.loadingCard}>
              <div class={styles.loadingDot} />
              <div>
                <strong>Esperando información</strong>
                <p>
                  El evento ya está seleccionado, falta recibir los datos del
                  servidor.
                </p>
              </div>
            </div>
          }
        >
          <div class={styles.content}>
            <div class={styles.summaryGrid}>
              <article class={styles.summaryCard}>
                <span class={styles.label}>Tipo</span>
                <strong>
                  {eventData()?.tipo === "rifa"
                    ? "Rifa"
                    : eventData()?.tipo === "subasta"
                      ? "Subasta"
                      : "Venta limitada"}
                </strong>
              </article>

              <article class={styles.summaryCard}>
                <span class={styles.label}>Estado</span>
                <strong class={getStateClass(eventData()?.estado)}>
                  {formatState(eventData()?.estado)}
                </strong>
              </article>

              <article class={styles.summaryCard}>
                <span class={styles.label}>Inicio</span>
                <strong>{formatDate(eventData()?.fecha_inicio)}</strong>
              </article>

              <article class={styles.summaryCard}>
                <span class={styles.label}>Fin</span>
                <strong>{formatDate(eventData()?.fecha_fin)}</strong>
              </article>
            </div>

            <div class={styles.detailsGrid}>
              <article class={styles.panel}>
                <h2 class={styles.panelTitle}>Información general</h2>

                <div class={styles.infoList}>
                  <div class={styles.infoRow}>
                    <span>Nombre</span>
                    <strong>{eventData()?.nombre}</strong>
                  </div>
                  <div class={styles.infoRow}>
                    <span>ID</span>
                    <strong>#{eventData()?.id}</strong>
                  </div>
                  <div class={styles.infoRow}>
                    <span>Usuario</span>
                    <strong>{eventData()?.usuario_id}</strong>
                  </div>
                  <div class={styles.infoRow}>
                    <span>Creado</span>
                    <strong>{formatDate(eventData()?.created_at)}</strong>
                  </div>
                </div>
              </article>

              <article class={styles.panel}>
                <h2 class={styles.panelTitle}>Metadata</h2>

                <Show
                  when={metadataEntries().length > 0}
                  fallback={
                    <p class={styles.mutedText}>Sin metadata disponible.</p>
                  }
                >
                  <div class={styles.metadataGrid}>
                    <For each={metadataEntries()}>
                      {([key, value]) => (
                        <div class={styles.metadataItem}>
                          <span>{key}</span>
                          <strong>{String(value)}</strong>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </article>
            </div>

            <Show when={rifaData()}>
              {(rifa) => (
                <article class={styles.panel}>
                  <div class={styles.rifaHeader}>
                    <div>
                      <h2 class={styles.panelTitle}>Números de la rifa</h2>
                      <p class={styles.mutedText}>
                        Se muestran todos los números del rango. Los activos
                        quedan resaltados.
                      </p>
                    </div>

                    <div class={styles.rifaStats}>
                      <span class={styles.statBox}>
                        Rango: {rifa().numero_inicio} - {rifa().numero_fin}
                      </span>
                      <span class={styles.statBox}>
                        Activos: {rifa().numeros_reservados?.length ?? 0}
                      </span>
                    </div>
                  </div>

                  <div class={styles.numbersGrid}>
                    <For each={allNumbers()}>
                      {(number) => {
                        const active = () => activeNumbers().has(number);

                        return (
                          <div
                            classList={{
                              [styles.numberCell]: true,
                              [styles.numberActive]: active(),
                              [styles.numberInactive]: !active(),
                            }}
                            title={active() ? "Reservado" : "Disponible"}
                          >
                            {number}
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </article>
              )}
            </Show>

            <Show when={subastaData()}>
              {(subasta) => (
                <article class={styles.panel}>
                  <div class={styles.rifaHeader}>
                    <div>
                      <h2 class={styles.panelTitle}>Items de la subasta</h2>
                      <p class={styles.mutedText}>
                        Cada item muestra su precio máximo.
                      </p>
                    </div>

                    <div class={styles.rifaStats}>
                      <span class={styles.statBox}>
                        Items: {subasta().items?.length ?? 0}
                      </span>
                    </div>
                  </div>

                  <div class={styles.itemGrid}>
                    <For each={subasta().items ?? []}>
                      {(item) => (
                        <div class={styles.itemCard}>
                          <strong class={styles.itemName}>{item.nombre}</strong>
                          <span class={styles.itemPrice}>
                            {formatCurrency(item.precio_maximo)}
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                </article>
              )}
            </Show>
          </div>
        </Show>
      </Show>
    </section>
  );
}

import { createSignal, For, onMount, createMemo, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import ModCURifa from "./ModCURifa";
import Pagination from "../../common/components/Pagination";
import {
  deleteEvent,
  fetchEventsType,
  fetchEventsTypeCount,
} from "../../../infrastructure/personEvents";
import styles from "./Rifas.module.css";
import {
  getTodayRange,
  getWeekRange,
  getMonthRange,
  formatDateTime,
} from "../../utils";
import type { RifaOut } from "../../../domain/personEvents";
import { confirm } from "../../common/UI/Confirm/confirmStore";
import { addToast } from "../../common/UI/Toast/toastStore";
import LoadingLoop from "../../common/IconSVG/LoadingLoop";
import type { ApiError } from "../../../domain/utils";

type RangeType = "hoy" | "semana" | "mes" | "personalizado";

export default function Rifas() {
  const navigate = useNavigate();

  const [page, setPage] = createSignal(1);
  const PAGE_SIZE = 15;

  const [totalCount, setTotalCount] = createSignal(0);
  const totalPages = createMemo(() =>
    totalCount() > 0 ? Math.ceil(totalCount() / PAGE_SIZE) : 0,
  );

  const [showModal, setShowModal] = createSignal(false);
  const [selectedRifa, setSelectedRifa] = createSignal<RifaOut | null>(null);
  const [range, setRange] = createSignal<RangeType>("semana");
  const [fechaInicio, setFechaInicio] = createSignal<string | null>(null);
  const [fechaFin, setFechaFin] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [rifas, setRifas] = createSignal<RifaOut[]>([]);

  function handleRangeChange(value: RangeType) {
    setRange(value);
    setPage(1);

    let inicio: string | null = null;
    let fin: string | null = null;

    if (value === "hoy") {
      ({ inicio, fin } = getTodayRange());
    } else if (value === "semana") {
      ({ inicio, fin } = getWeekRange());
    } else if (value === "mes") {
      ({ inicio, fin } = getMonthRange());
    }

    setFechaInicio(inicio);
    setFechaFin(fin);
  }

  async function handleSearch(targetPage = page()) {
    setLoading(true);

    try {
      const inicio = fechaInicio();
      const fin = fechaFin();
      const offset = (targetPage - 1) * PAGE_SIZE;

      const [countResponse, dataResponse] = await Promise.all([
        fetchEventsTypeCount("rifa", inicio, fin),
        fetchEventsType("rifa", offset, inicio, fin),
      ]);

      if (countResponse.error || dataResponse.error) {
        setRifas([]);
        setTotalCount(0);
        return;
      }

      setTotalCount(countResponse.data);

      const rifasSolo = dataResponse.data.filter(
        (e): e is RifaOut => e.tipo === "rifa",
      );
      setRifas(rifasSolo);

      if (targetPage !== page()) {
        setPage(targetPage);
      }
    } catch (err) {
      if ((err as ApiError).status === 401) {
        navigate("/login");
        return;
      }
      setRifas([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    void handleSearch(nextPage);
  }

  async function handleNewSearch() {
    setPage(1);
    await handleSearch(1);
  }

  onMount(async () => {
    handleRangeChange(range());
    await handleSearch(1);
  });

  return (
    <>
      <div class={styles.container}>
        <div class={styles.header}>
          <button
            class={styles.openBtn}
            onClick={() => {
              setSelectedRifa(null);
              setShowModal(true);
            }}
          >
            Crear
          </button>

          <div class={styles.filters}>
            <select
              class={styles.select}
              value={range()}
              onChange={(e) =>
                handleRangeChange(e.currentTarget.value as RangeType)
              }
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="personalizado">Personalizado</option>
            </select>

            <input
              type="date"
              class={styles.input}
              disabled={range() !== "personalizado"}
              value={fechaInicio() ?? ""}
              onInput={(e) => setFechaInicio(e.currentTarget.value)}
            />

            <input
              type="date"
              class={styles.input}
              disabled={range() !== "personalizado"}
              value={fechaFin() ?? ""}
              onInput={(e) => setFechaFin(e.currentTarget.value)}
            />

            <button
              class={styles.searchBtn}
              onClick={handleNewSearch}
              disabled={loading()}
            >
              {loading() ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {loading() ? (
          <LoadingLoop width="100%" height="50rem" />
        ) : (
          <>
            <div class={styles.grid}>
              {rifas().map((rifa) => {
                const total = rifa.numero_fin - rifa.numero_inicio + 1;
                const ocupados = rifa.numeros_reservados.length;

                return (
                  <div class={styles.card}>
                    <div class={styles.cardHeader}>
                      <h3>{rifa.nombre}</h3>
                      <div class={styles.actions}>
                        <button
                          onClick={() => {
                            setSelectedRifa(rifa);
                            setShowModal(true);
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={async () => {
                            const result = await confirm(
                              "Eliminar",
                              `Seguro de eliminar la rifa ${rifa.nombre}`,
                              async () => await deleteEvent(rifa.id),
                            );
                            if (result === null) return;

                            if (result?.error) {
                              addToast({
                                message: `Error al eliminar: ${result.error.detail}`,
                                type: "error",
                              });
                            } else if (result?.data) {
                              addToast({
                                message: "Rifa eliminada",
                                type: "success",
                              });
                              await handleSearch(page());
                            }
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <p>
                      <strong>Estado:</strong> {rifa.estado}
                    </p>

                    <p>
                      <strong>Inicio:</strong>{" "}
                      {formatDateTime(rifa.fecha_inicio)}
                    </p>
                    <p>
                      <strong>Fin:</strong> {formatDateTime(rifa.fecha_fin)}
                    </p>

                    <p>
                      <strong>Rango:</strong> {rifa.numero_inicio} -{" "}
                      {rifa.numero_fin}
                    </p>

                    <p>
                      <strong>Ocupados:</strong> {ocupados} / {total}
                    </p>

                    <p class={styles.createdAt}>
                      Creado: {formatDateTime(rifa.created_at)}
                    </p>

                    {rifa.metadata && (
                      <details class={styles.metadata}>
                        <summary>Ver Metadata</summary>
                        <table class={styles.metadataTable}>
                          <tbody>
                            <For each={Object.entries(rifa.metadata)}>
                              {([key, value]) => (
                                <tr>
                                  <td class={styles.metadataKey}>{key}</td>
                                  <td class={styles.metadataValue}>
                                    {typeof value === "object" ? (
                                      <pre>
                                        {JSON.stringify(value, null, 2)}
                                      </pre>
                                    ) : (
                                      value.toString()
                                    )}
                                  </td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>

            <Show when={totalPages() > 1}>
              <Pagination
                currentPage={page()}
                totalPages={totalPages()}
                onPageChange={handlePageChange}
              />
            </Show>
          </>
        )}
      </div>

      {showModal() && (
        <ModCURifa
          initialData={selectedRifa()}
          onClose={() => {
            setShowModal(false);
            setSelectedRifa(null);
          }}
          onSaved={async () => {
            await handleSearch(page());
          }}
        />
      )}
    </>
  );
}

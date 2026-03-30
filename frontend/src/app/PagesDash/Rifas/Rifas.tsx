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
import { type RangeType, getRangeByType, formatDateTime } from "../../utils";
import type { RifaOut } from "../../../domain/personEvents";
import { confirm } from "../../common/UI/Confirm/confirmStore";
import { addToast } from "../../common/UI/Toast/toastStore";
import LoadingLoop from "../../common/IconSVG/LoadingLoop";
import { useAuth } from "../../context/auth";

export default function Rifas() {
  const navigate = useNavigate();
  const { logout } = useAuth();

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

    const { inicio, fin } = getRangeByType(value);
    setFechaInicio(inicio);
    setFechaFin(fin);
  }

  async function handleSearch(targetPage = page()) {
    setLoading(true);

    const inicio = fechaInicio();
    const fin = fechaFin();
    const offset = (targetPage - 1) * PAGE_SIZE;

    const [countResponse, dataResponse] = await Promise.all([
      fetchEventsTypeCount("rifa", inicio, fin),
      fetchEventsType("rifa", offset, inicio, fin),
    ]);

    if (countResponse.error) {
      if (countResponse.error.status === 401) {
        await logout(false);
        navigate("/login");
      }
      setRifas([]);
      setTotalCount(0);
      return;
    }

    if (dataResponse.error) {
      if (dataResponse.error.status === 401) {
        await logout(false);
        navigate("/login");
      }
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
        <div class={styles.toolbar}>
          <div class={styles.titleBlock}>
            <h1 class={styles.title}>Rifas</h1>
          </div>

          <div class={styles.actionsBar}>
            <button
              class={styles.primaryBtn}
              onClick={() => {
                setSelectedRifa(null);
                setShowModal(true);
              }}
            >
              Crear rifa
            </button>
          </div>
        </div>

        <div class={styles.filtersCard}>
          <div class={styles.filters}>
            <div class={styles.field}>
              <label class={styles.label}>Rango</label>
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
            </div>

            <div class={styles.field}>
              <label class={styles.label}>Desde</label>
              <input
                type="date"
                class={styles.input}
                disabled={range() !== "personalizado"}
                value={fechaInicio() ?? ""}
                onInput={(e) => setFechaInicio(e.currentTarget.value)}
              />
            </div>

            <div class={styles.field}>
              <label class={styles.label}>Hasta</label>
              <input
                type="date"
                class={styles.input}
                disabled={range() !== "personalizado"}
                value={fechaFin() ?? ""}
                onInput={(e) => setFechaFin(e.currentTarget.value)}
              />
            </div>

            <div class={styles.fieldAction}>
              <label class={styles.labelInvisible}>Buscar</label>
              <button
                class={styles.secondaryBtn}
                onClick={handleNewSearch}
                disabled={loading()}
              >
                {loading() ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        </div>

        {loading() ? (
          <div class={styles.loadingWrap}>
            <LoadingLoop width="100%" height="42rem" />
          </div>
        ) : (
          <>
            <div class={styles.grid}>
              {rifas().map((rifa) => {
                const total = rifa.numero_fin - rifa.numero_inicio + 1;
                const ocupados = rifa.numeros_reservados.length;
                const porcentaje =
                  total > 0 ? Math.round((ocupados / total) * 100) : 0;

                return (
                  <article class={styles.card}>
                    <div class={styles.cardHeader}>
                      <div class={styles.cardTitleBlock}>
                        <h3 class={styles.cardTitle}>{rifa.nombre}</h3>
                        <span class={styles.badge}>{rifa.estado}</span>
                      </div>

                      <div class={styles.cardActions}>
                        <button
                          class={styles.iconBtn}
                          onClick={() => {
                            setSelectedRifa(rifa);
                            setShowModal(true);
                          }}
                          aria-label="Editar rifa"
                          title="Editar"
                        >
                          ✏️
                        </button>

                        <button
                          class={styles.iconBtn}
                          onClick={async () => {
                            const result = await confirm(
                              "Eliminar",
                              `Seguro de eliminar la rifa ${rifa.nombre}`,
                              async () => await deleteEvent(rifa.id),
                            );

                            if (result === null) return;

                            if (result?.error) {
                              if (result?.error.status === 401) {
                                await logout(false);
                                navigate(`/login`);
                              }

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
                          aria-label="Eliminar rifa"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div class={styles.infoGrid}>
                      <div class={styles.infoItem}>
                        <span class={styles.infoLabel}>Inicio</span>
                        <span class={styles.infoValue}>
                          {formatDateTime(rifa.fecha_inicio)}
                        </span>
                      </div>

                      <div class={styles.infoItem}>
                        <span class={styles.infoLabel}>Fin</span>
                        <span class={styles.infoValue}>
                          {formatDateTime(rifa.fecha_fin)}
                        </span>
                      </div>

                      <div class={styles.infoItem}>
                        <span class={styles.infoLabel}>Rango</span>
                        <span class={styles.infoValue}>
                          {rifa.numero_inicio} - {rifa.numero_fin}
                        </span>
                      </div>

                      <div class={styles.infoItem}>
                        <span class={styles.infoLabel}>Reservados</span>
                        <span class={styles.infoValue}>
                          {ocupados} / {total}
                        </span>
                      </div>
                    </div>

                    <div class={styles.progressSection}>
                      <div class={styles.progressMeta}>
                        <span class={styles.progressLabel}>Ocupación</span>
                        <span class={styles.progressPercent}>
                          {porcentaje}%
                        </span>
                      </div>

                      <div class={styles.progressBar}>
                        <div
                          class={styles.progressFill}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>

                    <p class={styles.createdAt}>
                      Creado: {formatDateTime(rifa.created_at)}
                    </p>

                    {rifa.metadata && (
                      <details class={styles.metadata}>
                        <summary class={styles.metadataSummary}>
                          Ver metadata
                        </summary>

                        <div class={styles.metadataBox}>
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
                        </div>
                      </details>
                    )}
                  </article>
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

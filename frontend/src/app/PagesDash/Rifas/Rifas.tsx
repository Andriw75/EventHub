import { createSignal } from "solid-js";
import ModCURifa from "./ModCURifa";
import { fetchEventsType } from "../../../infrastructure/personEvents";
import styles from "./Rifas.module.css";
import {
  getTodayRange,
  getWeekRange,
  getMonthRange,
  formatDateTime,
} from "../../utils";
import type { RifaOut } from "../../../domain/personEvents";

type RangeType = "hoy" | "semana" | "mes" | "personalizado";

export default function Rifas() {
  const [showModal, setShowModal] = createSignal(false);
  const [range, setRange] = createSignal<RangeType>("semana");
  const [fechaInicio, setFechaInicio] = createSignal<string | null>(null);
  const [fechaFin, setFechaFin] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [rifas, setRifas] = createSignal<RifaOut[]>([]);

  function handleRangeChange(value: RangeType) {
    setRange(value);
    if (value !== "personalizado") {
      setFechaInicio(null);
      setFechaFin(null);
    }
  }

  async function handleSearch() {
    let inicio = fechaInicio();
    let fin = fechaFin();

    if (range() === "hoy") ({ inicio, fin } = getTodayRange());
    if (range() === "semana") ({ inicio, fin } = getWeekRange());
    if (range() === "mes") ({ inicio, fin } = getMonthRange());

    setLoading(true);

    try {
      const response = await fetchEventsType("rifa", 0, inicio, fin);

      if (response.error) {
        console.error("Error fetching rifas:", response.error);
        setRifas([]);
      } else {
        const rifasSolo = response.data.filter(
          (e): e is RifaOut => e.tipo === "rifa",
        );
        setRifas(rifasSolo);
      }
    } catch (err) {
      console.error(err);
      setRifas([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class={styles.container}>
      {showModal() && <ModCURifa onClose={() => setShowModal(false)} />}

      <div class={styles.header}>
        <button class={styles.openBtn} onClick={() => setShowModal(true)}>
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
            onClick={handleSearch}
            disabled={loading()}
          >
            {loading() ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      <div class={styles.grid}>
        {rifas().map((rifa) => {
          const total = rifa.numero_fin - rifa.numero_inicio + 1;
          const ocupados = rifa.numeros_reservados.length;

          return (
            <div class={styles.card}>
              <div class={styles.cardHeader}>
                <h3>{rifa.nombre}</h3>
                <div class={styles.actions}>
                  <button onClick={() => console.log("editar", rifa)}>
                    ✏️
                  </button>
                  <button onClick={() => console.log("eliminar", rifa)}>
                    🗑️
                  </button>
                </div>
              </div>

              <p>
                <strong>Estado:</strong> {rifa.estado}
              </p>

              <p>
                <strong>Inicio:</strong> {formatDateTime(rifa.fecha_inicio)}
              </p>
              <p>
                <strong>Fin:</strong> {formatDateTime(rifa.fecha_fin)}
              </p>

              <p>
                <strong>Rango:</strong> {rifa.numero_inicio} - {rifa.numero_fin}
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
                  <pre>{JSON.stringify(rifa.metadata, null, 2)}</pre>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

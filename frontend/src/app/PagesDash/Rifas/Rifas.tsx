import { createSignal } from "solid-js";
import ModCURifa from "./ModCURifa";
import { fetchEventsType } from "../../../infrastructure/personEvents";
import styles from "./Rifas.module.css";
import { getTodayRange, getWeekRange, getMonthRange } from "../../utils";

type RangeType = "hoy" | "semana" | "mes" | "personalizado";

export default function Rifas() {
  const [showModal, setShowModal] = createSignal(false);

  const [range, setRange] = createSignal<RangeType>("semana");
  const [fechaInicio, setFechaInicio] = createSignal<string | null>(null);
  const [fechaFin, setFechaFin] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

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

    if (range() === "hoy") {
      ({ inicio, fin } = getTodayRange());
    }

    if (range() === "semana") {
      ({ inicio, fin } = getWeekRange());
    }

    if (range() === "mes") {
      ({ inicio, fin } = getMonthRange());
    }

    setLoading(true);

    const data_rifa = await fetchEventsType("rifa", 0, inicio, fin);
    console.log(data_rifa);

    setLoading(false);
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
    </div>
  );
}

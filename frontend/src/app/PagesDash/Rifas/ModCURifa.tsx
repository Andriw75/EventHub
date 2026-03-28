import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import ModalCommon from "../../common/UI/ModalCommon";
import type {
  RifaCreate,
  RifaOut,
  RifaUpdate,
} from "../../../domain/personEvents";
import styles from "./ModCURifa.module.css";
import KVList from "../../common/components/KVList";

interface ModCURifaProps {
  onClose: () => void;
  initialData?: RifaOut | null;
  onSaved?: () => void;
}

function toDateInputValue(date?: string | null) {
  return date ? date.slice(0, 10) : "";
}

function isSameJson(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function uniqueSortedNumbers(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function sanitizeNumbers(values: number[], min: number, max: number) {
  return uniqueSortedNumbers(values.filter((n) => n >= min && n <= max));
}

function arraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

type NumberSelectorProps = {
  min: number;
  max: number;
  selected: number[];
  onToggle: (value: number) => void;
  onSelectAll?: () => void;
  onClear?: () => void;
  disabled?: boolean;
};

function NumberCircleSelector(props: NumberSelectorProps) {
  const numbers = createMemo(() => {
    if (!Number.isFinite(props.min) || !Number.isFinite(props.max)) return [];
    if (props.min > props.max) return [];
    return Array.from(
      { length: props.max - props.min + 1 },
      (_, index) => props.min + index,
    );
  });

  return (
    <div class={styles.numbersSection}>
      <div class={styles.numbersHeader}>
        <div>
          <h2 class={styles.sectionTitle}>Números reservados</h2>
          <p class={styles.sectionSubtitle}>
            Activa o desactiva números con un clic. Los que queden fuera del
            rango se eliminan automáticamente.
          </p>
        </div>

        <div class={styles.numbersActions}>
          <button
            type="button"
            class={`${styles.smallButton} ${styles.secondaryButton}`}
            onClick={props.onSelectAll}
            disabled={props.disabled || numbers().length === 0}
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            class={`${styles.smallButton} ${styles.secondaryButton}`}
            onClick={props.onClear}
            disabled={props.disabled || props.selected.length === 0}
          >
            Limpiar
          </button>
        </div>
      </div>

      <Show
        when={numbers().length > 0}
        fallback={
          <div class={styles.emptyNumbersState}>
            Define un rango válido para ver los números disponibles.
          </div>
        }
      >
        <div class={styles.numbersGrid}>
          <For each={numbers()}>
            {(number) => {
              const active = () => props.selected.includes(number);

              return (
                <button
                  type="button"
                  classList={{
                    [styles.numberCircle]: true,
                    [styles.numberActive]: active(),
                    [styles.numberInactive]: !active(),
                  }}
                  disabled={props.disabled}
                  onClick={() => props.onToggle(number)}
                  title={active() ? "Reservado" : "Disponible"}
                >
                  {number}
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

export default function ModCURifa(props: ModCURifaProps) {
  const [nombre, setNombre] = createSignal("");
  const [fechaInicio, setFechaInicio] = createSignal("");
  const [fechaFin, setFechaFin] = createSignal("");
  const [numeroInicio, setNumeroInicio] = createSignal("1");
  const [numeroFin, setNumeroFin] = createSignal("100");
  const [numerosReservados, setNumerosReservados] = createSignal<number[]>([]);
  const [error, setError] = createSignal("");
  const [metadata, setMetadata] = createSignal<Record<string, any>>({});
  const [loading, setLoading] = createSignal(false);
  const [previewOriginal, setPreviewOriginal] = createSignal(false);

  const isEditing = createMemo(() => !!props.initialData?.id);

  createEffect(() => {
    const rifa = props.initialData;

    if (rifa) {
      setNombre(rifa.nombre ?? "");
      setFechaInicio(toDateInputValue(rifa.fecha_inicio));
      setFechaFin(toDateInputValue(rifa.fecha_fin));
      setNumeroInicio(String(rifa.numero_inicio ?? 1));
      setNumeroFin(String(rifa.numero_fin ?? 100));
      setNumerosReservados(
        sanitizeNumbers(
          (rifa as any).numeros_reservados ?? [],
          Number(rifa.numero_inicio ?? 1),
          Number(rifa.numero_fin ?? 100),
        ),
      );
      setMetadata(rifa.metadata ?? {});
      setError("");
      setPreviewOriginal(false);
      return;
    }

    setNombre("");
    setFechaInicio("");
    setFechaFin("");
    setNumeroInicio("1");
    setNumeroFin("100");
    setNumerosReservados([]);
    setMetadata({});
    setError("");
    setPreviewOriginal(false);
  });

  const currentMin = createMemo(() => Number(numeroInicio()));
  const currentMax = createMemo(() => Number(numeroFin()));

  createEffect(() => {
    const min = currentMin();
    const max = currentMax();

    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return;

    const sanitized = sanitizeNumbers(numerosReservados(), min, max);
    if (!arraysEqual(sanitized, numerosReservados())) {
      setNumerosReservados(sanitized);
    }
  });

  const originalScalarValues = createMemo(() => ({
    nombre: props.initialData?.nombre ?? "",
    fechaInicio: toDateInputValue(props.initialData?.fecha_inicio),
    fechaFin: toDateInputValue(props.initialData?.fecha_fin),
    numeroInicio: String(props.initialData?.numero_inicio ?? 1),
    numeroFin: String(props.initialData?.numero_fin ?? 100),
  }));

  const originalReservedNumbers = createMemo(() =>
    uniqueSortedNumbers((props.initialData as any)?.numeros_reservados ?? []),
  );

  const currentScalarValues = createMemo(() => ({
    nombre: nombre(),
    fechaInicio: fechaInicio(),
    fechaFin: fechaFin(),
    numeroInicio: numeroInicio(),
    numeroFin: numeroFin(),
  }));

  const displayScalar = (
    field: keyof ReturnType<typeof currentScalarValues>,
  ) =>
    previewOriginal() && isEditing()
      ? originalScalarValues()[field]
      : currentScalarValues()[field];

  const displayMetadata = createMemo(() =>
    previewOriginal() && isEditing()
      ? (props.initialData?.metadata ?? {})
      : metadata(),
  );

  const displayReservedNumbers = createMemo(() =>
    previewOriginal() && isEditing()
      ? originalReservedNumbers()
      : numerosReservados(),
  );

  const changed = (field: keyof ReturnType<typeof currentScalarValues>) => {
    if (!isEditing()) return false;
    return currentScalarValues()[field] !== originalScalarValues()[field];
  };

  const reservedChanged = createMemo(() => {
    if (!isEditing()) return false;
    return !arraysEqual(numerosReservados(), originalReservedNumbers());
  });

  const metadataChanged = createMemo(() => {
    if (!isEditing()) return false;
    return !isSameJson(metadata(), props.initialData?.metadata ?? {});
  });

  const hasChanges = createMemo(() => {
    if (!isEditing()) return true;

    return (
      changed("nombre") ||
      changed("fechaInicio") ||
      changed("fechaFin") ||
      changed("numeroInicio") ||
      changed("numeroFin") ||
      metadataChanged() ||
      reservedChanged()
    );
  });

  const restoreOriginals = () => {
    if (!props.initialData) return;

    setNombre(props.initialData.nombre ?? "");
    setFechaInicio(toDateInputValue(props.initialData.fecha_inicio));
    setFechaFin(toDateInputValue(props.initialData.fecha_fin));
    setNumeroInicio(String(props.initialData.numero_inicio ?? 1));
    setNumeroFin(String(props.initialData.numero_fin ?? 100));
    setNumerosReservados(
      uniqueSortedNumbers((props.initialData as any)?.numeros_reservados ?? []),
    );
    setMetadata(props.initialData.metadata ?? {});
  };

  const toggleReservado = (numero: number) => {
    const min = currentMin();
    const max = currentMax();

    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return;
    if (numero < min || numero > max) return;

    setNumerosReservados((prev) => {
      if (prev.includes(numero)) {
        return prev.filter((n) => n !== numero);
      }
      return uniqueSortedNumbers([...prev, numero]);
    });
  };

  const selectAllInRange = () => {
    const min = currentMin();
    const max = currentMax();

    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return;

    const all = Array.from(
      { length: max - min + 1 },
      (_, index) => min + index,
    );
    setNumerosReservados(all);
  };

  const clearAll = () => setNumerosReservados([]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    const nombreValue = nombre().trim();
    const numeroInicioValue = Number(numeroInicio());
    const numeroFinValue = Number(numeroFin());

    if (!nombreValue) {
      setError("El nombre es obligatorio");
      return;
    }

    if (
      !Number.isFinite(numeroInicioValue) ||
      !Number.isFinite(numeroFinValue)
    ) {
      setError("Los números deben ser válidos");
      return;
    }

    if (numeroInicioValue > numeroFinValue) {
      setError("El número inicial no puede ser mayor que el final");
      return;
    }

    const reservedClean = sanitizeNumbers(
      numerosReservados(),
      numeroInicioValue,
      numeroFinValue,
    );

    const basePayload = {
      nombre: nombreValue,
      fecha_inicio: fechaInicio() || null,
      fecha_fin: fechaFin() || null,
      numero_inicio: numeroInicioValue,
      numero_fin: numeroFinValue,
      numeros_reservados: reservedClean,
      metadata: metadata(),
    };

    try {
      setLoading(true);

      if (props.initialData?.id) {
        const payload: RifaUpdate = {};

        if (changed("nombre")) payload.nombre = nombreValue;
        if (changed("fechaInicio"))
          payload.fecha_inicio = fechaInicio() || null;
        if (changed("fechaFin")) payload.fecha_fin = fechaFin() || null;
        if (changed("numeroInicio")) payload.numero_inicio = numeroInicioValue;
        if (changed("numeroFin")) payload.numero_fin = numeroFinValue;
        if (reservedChanged())
          (payload as any).numeros_reservados = reservedClean;
        if (metadataChanged()) payload.metadata = metadata();

        console.log("actualizando rifa", props.initialData.id, payload);
        // await updateRifa(props.initialData.id, payload);
      } else {
        const payload: RifaCreate = basePayload as RifaCreate;
        console.log("creando rifa", payload);
        // await createRifa(payload);
      }

      props.onSaved?.();
      props.onClose();
    } catch (err) {
      console.error(err);
      setError("Error al guardar la rifa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalCommon onClose={props.onClose} width="56%">
      <h1 class={styles.rifaTitle}>
        {isEditing() ? "Editando rifa" : "Creando rifa"}
      </h1>

      <form class={styles.modalContent} onSubmit={handleSubmit}>
        <div class={styles.field}>
          <label class={styles.label} for="rifa-nombre">
            Nombre
          </label>
          <input
            id="rifa-nombre"
            class={styles.modalInput}
            classList={{ [styles.campoModificado]: changed("nombre") }}
            type="text"
            placeholder="Nombre de la rifa"
            value={displayScalar("nombre")}
            onInput={(e) => setNombre(e.currentTarget.value)}
          />
        </div>

        <div class={styles.dateRow}>
          <div class={styles.field}>
            <label class={styles.label} for="rifa-fecha-inicio">
              Fecha de inicio
            </label>
            <input
              id="rifa-fecha-inicio"
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("fechaInicio") }}
              type="date"
              value={displayScalar("fechaInicio")}
              onInput={(e) => setFechaInicio(e.currentTarget.value)}
            />
          </div>

          <div class={styles.field}>
            <label class={styles.label} for="rifa-fecha-fin">
              Fecha de fin
            </label>
            <input
              id="rifa-fecha-fin"
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("fechaFin") }}
              type="date"
              value={displayScalar("fechaFin")}
              onInput={(e) => setFechaFin(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class={styles.dateRow}>
          <div class={styles.field}>
            <label class={styles.label} for="rifa-numero-inicio">
              Número inicio
            </label>
            <input
              id="rifa-numero-inicio"
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("numeroInicio") }}
              type="number"
              min="1"
              placeholder="Número inicio"
              value={displayScalar("numeroInicio")}
              onInput={(e) => setNumeroInicio(e.currentTarget.value)}
            />
          </div>

          <div class={styles.field}>
            <label class={styles.label} for="rifa-numero-fin">
              Número fin
            </label>
            <input
              id="rifa-numero-fin"
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("numeroFin") }}
              type="number"
              min="1"
              placeholder="Número fin"
              value={displayScalar("numeroFin")}
              onInput={(e) => setNumeroFin(e.currentTarget.value)}
            />
          </div>
        </div>

        <NumberCircleSelector
          min={currentMin()}
          max={currentMax()}
          selected={displayReservedNumbers()}
          onToggle={toggleReservado}
          onSelectAll={selectAllInRange}
          onClear={clearAll}
          disabled={loading()}
        />

        <div class={styles.field}>
          <label class={styles.label}>Metadata</label>
          <KVList data={displayMetadata()} onChange={setMetadata} />
        </div>

        <Show when={error()}>
          <span class={styles.errorMessage}>{error()}</span>
        </Show>

        <div class={styles.actions}>
          <div class={styles.leftAction}>
            <button
              type="button"
              class={`${styles.modalButton} ${styles.cancelButton}`}
              onClick={props.onClose}
              disabled={loading()}
            >
              Cancelar
            </button>
          </div>

          <div class={styles.middleAction}>
            {isEditing() && (
              <button
                type="button"
                class={`${styles.modalButton} ${styles.previewButton}`}
                disabled={!hasChanges() || loading()}
                onMouseEnter={() => hasChanges() && setPreviewOriginal(true)}
                onMouseLeave={() => setPreviewOriginal(false)}
                onClick={restoreOriginals}
              >
                Ver originales
              </button>
            )}
          </div>

          <div class={styles.rightAction}>
            <button
              class={`${styles.modalButton} ${styles.saveButton}`}
              type="submit"
              disabled={loading()}
            >
              {loading()
                ? isEditing()
                  ? "Actualizando..."
                  : "Creando..."
                : isEditing()
                  ? "Actualizar rifa"
                  : "Crear rifa"}
            </button>
          </div>
        </div>
      </form>
    </ModalCommon>
  );
}

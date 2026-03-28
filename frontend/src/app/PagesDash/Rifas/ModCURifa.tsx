import { createEffect, createMemo, createSignal } from "solid-js";
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

export default function ModCURifa(props: ModCURifaProps) {
  const [nombre, setNombre] = createSignal("");
  const [fechaInicio, setFechaInicio] = createSignal("");
  const [fechaFin, setFechaFin] = createSignal("");
  const [numeroInicio, setNumeroInicio] = createSignal("1");
  const [numeroFin, setNumeroFin] = createSignal("100");
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
    setMetadata({});
    setError("");
    setPreviewOriginal(false);
  });

  const originalScalarValues = createMemo(() => ({
    nombre: props.initialData?.nombre ?? "",
    fechaInicio: toDateInputValue(props.initialData?.fecha_inicio),
    fechaFin: toDateInputValue(props.initialData?.fecha_fin),
    numeroInicio: String(props.initialData?.numero_inicio ?? 1),
    numeroFin: String(props.initialData?.numero_fin ?? 100),
  }));

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

  const changed = (field: keyof ReturnType<typeof currentScalarValues>) => {
    if (!isEditing()) return false;
    return currentScalarValues()[field] !== originalScalarValues()[field];
  };

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
      metadataChanged()
    );
  });

  const restoreOriginals = () => {
    if (!props.initialData) return;

    setNombre(props.initialData.nombre ?? "");
    setFechaInicio(toDateInputValue(props.initialData.fecha_inicio));
    setFechaFin(toDateInputValue(props.initialData.fecha_fin));
    setNumeroInicio(String(props.initialData.numero_inicio ?? 1));
    setNumeroFin(String(props.initialData.numero_fin ?? 100));
    setMetadata(props.initialData.metadata ?? {});
  };

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

    const basePayload = {
      nombre: nombreValue,
      fecha_inicio: fechaInicio() || null,
      fecha_fin: fechaFin() || null,
      numero_inicio: numeroInicioValue,
      numero_fin: numeroFinValue,
      metadata: metadata(),
    };

    try {
      setLoading(true);

      if (props.initialData?.id) {
        const payload: RifaUpdate = basePayload;
        console.log("actualizando rifa", props.initialData.id, payload);
        // await updateRifa(props.initialData.id, payload);
      } else {
        const payload: RifaCreate = basePayload;
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
    <ModalCommon onClose={props.onClose} width="40%">
      <h1 class={styles.rifaTitle}>
        {isEditing() ? "Editando rifa" : "Creando rifa"}
      </h1>

      <form class={styles.modalContent} onSubmit={handleSubmit}>
        <input
          class={styles.modalInput}
          classList={{ [styles.campoModificado]: changed("nombre") }}
          type="text"
          placeholder="Nombre de la rifa"
          value={displayScalar("nombre")}
          onInput={(e) => setNombre(e.currentTarget.value)}
        />

        <input
          class={styles.modalInput}
          classList={{ [styles.campoModificado]: changed("fechaInicio") }}
          type="date"
          value={displayScalar("fechaInicio")}
          onInput={(e) => setFechaInicio(e.currentTarget.value)}
        />

        <input
          class={styles.modalInput}
          classList={{ [styles.campoModificado]: changed("fechaFin") }}
          type="date"
          value={displayScalar("fechaFin")}
          onInput={(e) => setFechaFin(e.currentTarget.value)}
        />

        <input
          class={styles.modalInput}
          classList={{ [styles.campoModificado]: changed("numeroInicio") }}
          type="number"
          placeholder="Número inicio"
          value={displayScalar("numeroInicio")}
          onInput={(e) => setNumeroInicio(e.currentTarget.value)}
        />

        <input
          class={styles.modalInput}
          classList={{ [styles.campoModificado]: changed("numeroFin") }}
          type="number"
          placeholder="Número fin"
          value={displayScalar("numeroFin")}
          onInput={(e) => setNumeroFin(e.currentTarget.value)}
        />

        <KVList data={displayMetadata()} onChange={setMetadata} />

        {error() && <span class={styles.errorMessage}>{error()}</span>}

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
                Ver Originales
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
                  ? "Actualizar Rifa"
                  : "Crear Rifa"}
            </button>
          </div>
        </div>
      </form>
    </ModalCommon>
  );
}

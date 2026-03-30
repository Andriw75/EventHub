import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import ModalCommon from "../../common/UI/ModalCommon";
import type {
  SubastaCreate,
  SubastaOut,
  SubastaUpdate,
  EventState,
} from "../../../domain/personEvents";
import styles from "./ModCUSubasta.module.css";
import KVList from "../../common/components/KVList";
import {
  createSubasta,
  updateSubasta,
} from "../../../infrastructure/personEvents";
import { addToast } from "../../common/UI/Toast/toastStore";
import type { ApiError } from "../../../domain/utils";

interface ModCUSubastaProps {
  onClose: () => void;
  initialData?: SubastaOut | null;
  onSaved?: () => void;
}

type ItemDraft = {
  nombre: string;
  precio_maximo: string;
};

function toDateInputValue(date?: string | null) {
  return date ? date.slice(0, 10) : "";
}

function isSameJson(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function itemsToStrings(
  items: { nombre: string; precio_maximo: number }[],
): ItemDraft[] {
  return items.map((i) => ({
    nombre: i.nombre,
    precio_maximo: String(i.precio_maximo),
  }));
}

function draftsToPayload(
  drafts: ItemDraft[],
): { nombre: string; precio_maximo: number }[] {
  return drafts.map((d) => ({
    nombre: d.nombre.trim(),
    precio_maximo: Number(d.precio_maximo),
  }));
}

export default function ModCUSubasta(props: ModCUSubastaProps) {
  const navigate = useNavigate();

  const [nombre, setNombre] = createSignal("");
  const [fechaInicio, setFechaInicio] = createSignal("");
  const [fechaFin, setFechaFin] = createSignal("");
  const [estado, setEstado] = createSignal<EventState | "">("");
  const [items, setItems] = createSignal<ItemDraft[]>([]);
  const [metadata, setMetadata] = createSignal<Record<string, any>>({});
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [previewOriginal, setPreviewOriginal] = createSignal(false);

  const isEditing = createMemo(() => !!props.initialData?.id);

  createEffect(() => {
    const subasta = props.initialData;

    if (subasta) {
      setNombre(subasta.nombre ?? "");
      setEstado((subasta.estado as EventState) ?? "");
      setFechaInicio(toDateInputValue(subasta.fecha_inicio));
      setFechaFin(toDateInputValue(subasta.fecha_fin));
      setItems(itemsToStrings(subasta.items ?? []));
      setMetadata(subasta.metadata ?? {});
      setError("");
      setPreviewOriginal(false);
      return;
    }

    setNombre("");
    setEstado("");
    setFechaInicio("");
    setFechaFin("");
    setItems([{ nombre: "", precio_maximo: "" }]);
    setMetadata({});
    setError("");
    setPreviewOriginal(false);
  });

  const originalScalarValues = createMemo(() => ({
    nombre: props.initialData?.nombre ?? "",
    fechaInicio: toDateInputValue(props.initialData?.fecha_inicio),
    fechaFin: toDateInputValue(props.initialData?.fecha_fin),
    estado: (props.initialData?.estado as EventState) ?? "",
  }));

  const originalItems = createMemo(() =>
    itemsToStrings(props.initialData?.items ?? []),
  );

  const currentScalarValues = createMemo(() => ({
    nombre: nombre(),
    fechaInicio: fechaInicio(),
    fechaFin: fechaFin(),
    estado: estado(),
  }));

  const displayScalar = (
    field: keyof ReturnType<typeof currentScalarValues>,
  ) =>
    previewOriginal() && isEditing()
      ? originalScalarValues()[field]
      : currentScalarValues()[field];

  const displayItems = createMemo(() =>
    previewOriginal() && isEditing() ? originalItems() : items(),
  );

  const displayMetadata = createMemo(() =>
    previewOriginal() && isEditing()
      ? (props.initialData?.metadata ?? {})
      : metadata(),
  );

  const changed = (field: keyof ReturnType<typeof currentScalarValues>) => {
    if (!isEditing()) return false;
    return currentScalarValues()[field] !== originalScalarValues()[field];
  };

  const itemsChanged = createMemo(() => {
    if (!isEditing()) return false;
    return !isSameJson(items(), originalItems());
  });

  const metadataChanged = createMemo(() => {
    if (!isEditing()) return false;
    return !isSameJson(metadata(), props.initialData?.metadata ?? {});
  });

  const hasChanges = createMemo(() => {
    if (!isEditing()) return true;
    return (
      changed("nombre") ||
      changed("estado") ||
      changed("fechaInicio") ||
      changed("fechaFin") ||
      itemsChanged() ||
      metadataChanged()
    );
  });

  function addItem() {
    setItems((prev) => [...prev, { nombre: "", precio_maximo: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItemNombre(index: number, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? Object.assign(item, { nombre: value }) : item,
      ),
    );
  }

  function updateItemPrecio(index: number, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? Object.assign(item, { precio_maximo: value }) : item,
      ),
    );
  }

  const restoreOriginals = () => {
    if (!props.initialData) return;
    setNombre(props.initialData.nombre ?? "");
    setEstado((props.initialData.estado as EventState) ?? "");
    setFechaInicio(toDateInputValue(props.initialData.fecha_inicio));
    setFechaFin(toDateInputValue(props.initialData.fecha_fin));
    setItems(itemsToStrings(props.initialData.items ?? []));
    setMetadata(props.initialData.metadata ?? {});
  };

  function validateItems(drafts: ItemDraft[]): string | null {
    if (drafts.length === 0) return "Debe agregar al menos un ítem.";

    for (let i = 0; i < drafts.length; i++) {
      if (!drafts[i].nombre.trim()) {
        return `El ítem ${i + 1} no tiene nombre.`;
      }
      const precio = Number(drafts[i].precio_maximo);
      if (!Number.isFinite(precio) || precio <= 0) {
        return `El precio del ítem "${drafts[i].nombre || i + 1}" debe ser mayor a 0.`;
      }
    }
    return null;
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    const nombreValue = nombre().trim();

    if (!nombreValue) {
      setError("El nombre es obligatorio.");
      return;
    }

    const itemsValidationError = validateItems(items());
    if (itemsValidationError) {
      setError(itemsValidationError);
      return;
    }

    const itemsPayload = draftsToPayload(items());

    try {
      setLoading(true);

      if (props.initialData?.id) {
        const payload: SubastaUpdate = {};

        if (changed("nombre")) payload.nombre = nombreValue;
        if (changed("estado"))
          payload.estado = (estado() as EventState) || null;
        if (changed("fechaInicio"))
          payload.fecha_inicio = fechaInicio() || null;
        if (changed("fechaFin")) payload.fecha_fin = fechaFin() || null;
        if (itemsChanged()) payload.items = itemsPayload;
        if (metadataChanged()) payload.metadata = metadata();

        await updateSubasta(props.initialData.id, payload);
        addToast({
          message: "Subasta actualizada correctamente",
          type: "success",
        });
      } else {
        const payload: SubastaCreate = {
          nombre: nombreValue,
          fecha_inicio: fechaInicio() || null,
          fecha_fin: fechaFin() || null,
          items: itemsPayload,
          metadata: metadata(),
        };
        await createSubasta(payload);
        addToast({ message: "Subasta creada correctamente", type: "success" });
      }

      props.onSaved?.();
      props.onClose();
    } catch (err) {
      if ((err as ApiError).status === 401) {
        navigate("/login");
        return;
      }
      setError("Error al guardar la subasta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalCommon onClose={props.onClose} width="56%">
      <h1 class={styles.subastaTitle}>
        {isEditing() ? "Editando subasta" : "Creando subasta"}
      </h1>

      <form class={styles.modalContent} onSubmit={handleSubmit}>
        <div class={styles.dateRow}>
          <div class={styles.field}>
            <label class={styles.label}>Nombre</label>
            <input
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("nombre") }}
              type="text"
              placeholder="Nombre de la subasta"
              value={displayScalar("nombre")}
              onInput={(e) => setNombre(e.currentTarget.value)}
            />
          </div>

          <div class={styles.field}>
            <label class={styles.label}>Estado</label>
            <select
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("estado") }}
              value={displayScalar("estado")}
              onChange={(e) => setEstado(e.currentTarget.value as EventState)}
            >
              <option value="">Sin estado</option>
              <option value="Proximo">Próximo</option>
              <option value="En_curso">En curso</option>
              <option value="Finalizado">Finalizada</option>
            </select>
          </div>
        </div>

        <div class={styles.dateRow}>
          <div class={styles.field}>
            <label class={styles.label}>Fecha de inicio</label>
            <input
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("fechaInicio") }}
              type="date"
              value={displayScalar("fechaInicio")}
              onInput={(e) => setFechaInicio(e.currentTarget.value)}
            />
          </div>

          <div class={styles.field}>
            <label class={styles.label}>Fecha de fin</label>
            <input
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("fechaFin") }}
              type="date"
              value={displayScalar("fechaFin")}
              onInput={(e) => setFechaFin(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class={styles.itemsSection}>
          <div class={styles.itemsHeader}>
            <div>
              <h2 class={styles.sectionTitle}>Ítems de subasta</h2>
              <p class={styles.sectionSubtitle}>
                Agrega los ítems que se subastarán con su precio máximo.
              </p>
            </div>

            <button
              type="button"
              class={styles.addItemBtn}
              onClick={addItem}
              disabled={loading() || (previewOriginal() && isEditing())}
            >
              + Agregar ítem
            </button>
          </div>

          <Show
            when={displayItems().length > 0}
            fallback={
              <div class={styles.emptyItemsState}>
                Sin ítems. Haz clic en "+ Agregar ítem" para comenzar.
              </div>
            }
          >
            <div class={styles.itemsList}>
              <For each={displayItems()}>
                {(item, index) => {
                  const originalItem = originalItems()[index()];
                  const isNew = isEditing() && !originalItem;
                  const isModified =
                    isEditing() &&
                    originalItem &&
                    (item.nombre !== originalItem.nombre ||
                      item.precio_maximo !== originalItem.precio_maximo);

                  return (
                    <div
                      class={styles.itemRow}
                      classList={{
                        [styles.itemRowChanged]: !!(isNew || isModified),
                      }}
                    >
                      <input
                        class={styles.itemInput}
                        type="text"
                        placeholder={`Nombre del ítem ${index() + 1}`}
                        value={item.nombre}
                        onInput={(e) =>
                          updateItemNombre(index(), e.currentTarget.value)
                        }
                        disabled={
                          loading() || (previewOriginal() && isEditing())
                        }
                      />

                      <input
                        class={styles.itemPriceInput}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Precio máx."
                        value={item.precio_maximo}
                        onInput={(e) =>
                          updateItemPrecio(index(), e.currentTarget.value)
                        }
                        disabled={
                          loading() || (previewOriginal() && isEditing())
                        }
                      />

                      <button
                        type="button"
                        class={styles.removeItemBtn}
                        onClick={() => removeItem(index())}
                        disabled={
                          loading() || (previewOriginal() && isEditing())
                        }
                        title="Eliminar ítem"
                        aria-label="Eliminar ítem"
                      >
                        ✕
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>

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
                  ? "Actualizar subasta"
                  : "Crear subasta"}
            </button>
          </div>
        </div>
      </form>
    </ModalCommon>
  );
}

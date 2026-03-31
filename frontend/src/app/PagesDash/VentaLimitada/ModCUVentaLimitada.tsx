import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import ModalCommon from "../../common/UI/ModalCommon";
import type {
  VentaLimitadaCreate,
  VentaLimitadaOut,
  VentaLimitadaUpdate,
  EventState,
} from "../../../domain/personEvents";
import styles from "./ModCUVentaLimitada.module.css";
import KVList from "../../common/components/KVList";
import {
  createVentaLimitada,
  updateVentaLimitada,
} from "../../../infrastructure/personEvents";
import { addToast } from "../../common/UI/Toast/toastStore";
import type { ApiError } from "../../../domain/utils";
import { useAuth } from "../../context/auth";

interface ModCUVentaLimitadaProps {
  onClose: () => void;
  initialData?: VentaLimitadaOut | null;
  onSaved?: () => void;
}

type ItemDraft = {
  nombre: string;
  precio: string;
  n_cantidad_maxima: string;
};

function toDateInputValue(date?: string | null) {
  return date ? date.slice(0, 10) : "";
}

function isSameJson(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function itemsToStrings(
  items: { nombre: string; precio: number; n_cantidad_maxima: number }[],
): ItemDraft[] {
  return items.map((i) => ({
    nombre: i.nombre,
    precio: String(i.precio),
    n_cantidad_maxima: String(i.n_cantidad_maxima),
  }));
}

function draftsToPayload(
  drafts: ItemDraft[],
): { nombre: string; precio: number; n_cantidad_maxima: number }[] {
  return drafts.map((d) => ({
    nombre: d.nombre.trim(),
    precio: Number(d.precio),
    n_cantidad_maxima: Number(d.n_cantidad_maxima),
  }));
}

export default function ModCUVentaLimitada(props: ModCUVentaLimitadaProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

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
    const venta = props.initialData;

    if (venta) {
      setNombre(venta.nombre ?? "");
      setEstado((venta.estado as EventState) ?? "");
      setFechaInicio(toDateInputValue(venta.fecha_inicio));
      setFechaFin(toDateInputValue(venta.fecha_fin));
      setItems(itemsToStrings(venta.items ?? []));
      setMetadata(venta.metadata ?? {});
      setError("");
      setPreviewOriginal(false);
      return;
    }

    setNombre("");
    setEstado("");
    setFechaInicio("");
    setFechaFin("");
    setItems([{ nombre: "", precio: "", n_cantidad_maxima: "" }]);
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
    setItems((prev) => [
      ...prev,
      { nombre: "", precio: "", n_cantidad_maxima: "" },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(
    index: number,
    field: keyof ItemDraft,
    value: string,
  ) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
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
      const d = drafts[i];
      if (!d.nombre.trim()) {
        return `El ítem ${i + 1} no tiene nombre.`;
      }
      const precio = Number(d.precio);
      if (!Number.isFinite(precio) || precio <= 0) {
        return `El precio del ítem "${d.nombre || i + 1}" debe ser mayor a 0.`;
      }
      const cantidad = Number(d.n_cantidad_maxima);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return `La cantidad del ítem "${d.nombre || i + 1}" debe ser un entero mayor a 0.`;
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
        const payload: VentaLimitadaUpdate = {};

        if (changed("nombre")) payload.nombre = nombreValue;
        if (changed("estado"))
          payload.estado = (estado() as EventState) || null;
        if (changed("fechaInicio"))
          payload.fecha_inicio = fechaInicio() || null;
        if (changed("fechaFin")) payload.fecha_fin = fechaFin() || null;
        if (itemsChanged()) payload.items = itemsPayload;
        if (metadataChanged()) payload.metadata = metadata();

        const result = await updateVentaLimitada(props.initialData.id, payload);
        if (result.error) {
          if (result.error.status === 401) {
            await logout(false);
            navigate("/login");
            return;
          }
          setError("Error al actualizar la venta limitada.");
          return;
        }
        addToast({
          message: "Venta limitada actualizada correctamente",
          type: "success",
        });
      } else {
        const payload: VentaLimitadaCreate = {
          nombre: nombreValue,
          fecha_inicio: fechaInicio() || null,
          fecha_fin: fechaFin() || null,
          items: itemsPayload,
          metadata: metadata(),
        };
        const result = await createVentaLimitada(payload);
        if (result.error) {
          if (result.error.status === 401) {
            await logout(false);
            navigate("/login");
            return;
          }
          setError("Error al crear la venta limitada.");
          return;
        }
        addToast({
          message: "Venta limitada creada correctamente",
          type: "success",
        });
      }

      props.onSaved?.();
      props.onClose();
    } catch (err) {
      if ((err as ApiError).status === 401) {
        await logout(false);
        navigate("/login");
        return;
      }
      setError("Error al guardar la venta limitada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalCommon onClose={props.onClose} width="56%">
      <h1 class={styles.ventaTitle}>
        {isEditing() ? "Editando venta limitada" : "Creando venta limitada"}
      </h1>

      <form class={styles.modalContent} onSubmit={handleSubmit}>
        <div class={styles.dateRow}>
          <div class={styles.field}>
            <label class={styles.label}>Nombre</label>
            <input
              class={styles.modalInput}
              classList={{ [styles.campoModificado]: changed("nombre") }}
              type="text"
              placeholder="Nombre de la venta"
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
              <h2 class={styles.sectionTitle}>Ítems de venta</h2>
              <p class={styles.sectionSubtitle}>
                Agrega los ítems con su precio y cantidad máxima disponible.
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
                      item.precio !== originalItem.precio ||
                      item.n_cantidad_maxima !==
                        originalItem.n_cantidad_maxima);

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
                          updateField(index(), "nombre", e.currentTarget.value)
                        }
                        disabled={
                          loading() || (previewOriginal() && isEditing())
                        }
                      />

                      <input
                        class={styles.itemNumberInput}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Precio"
                        value={item.precio}
                        onInput={(e) =>
                          updateField(index(), "precio", e.currentTarget.value)
                        }
                        disabled={
                          loading() || (previewOriginal() && isEditing())
                        }
                      />

                      <input
                        class={styles.itemNumberInput}
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Cant. máx."
                        value={item.n_cantidad_maxima}
                        onInput={(e) =>
                          updateField(
                            index(),
                            "n_cantidad_maxima",
                            e.currentTarget.value,
                          )
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
                  ? "Actualizar venta"
                  : "Crear venta"}
            </button>
          </div>
        </div>
      </form>
    </ModalCommon>
  );
}
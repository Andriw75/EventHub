import { createSignal, createEffect, For } from "solid-js";
import styles from "./KVList.module.css";

interface KVListProps {
  data?: Record<string, any>;
  onChange?: (newData: Record<string, any>) => void;
}

export default function KVList(props: KVListProps) {
  const [items, setItems] = createSignal<{ key: string; value: any }[]>([]);

  // Inicializa items cuando props.data cambia
  createEffect(() => {
    if (props.data) {
      setItems(
        Object.entries(props.data).map(([key, value]) => ({ key, value })),
      );
    }
  });

  const updateItem = (index: number, key: string, value: any) => {
    const newItems = [...items()];
    newItems[index] = { key, value };
    setItems(newItems);
    props.onChange?.(Object.fromEntries(newItems.map((i) => [i.key, i.value])));
  };

  const addItem = () => setItems([...items(), { key: "", value: "" }]);
  const removeItem = (index: number) => {
    const newItems = [...items()];
    newItems.splice(index, 1);
    setItems(newItems);
    props.onChange?.(Object.fromEntries(newItems.map((i) => [i.key, i.value])));
  };

  // Drag & Drop
  const onDragStart = (e: DragEvent, index: number) => {
    e.dataTransfer?.setData("text/plain", index.toString());
    e.dataTransfer?.setDragImage(new Image(), 0, 0); // evitar ghost image
  };

  const onDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer?.getData("text/plain") || "0");
    if (draggedIndex === index) return;
    const newItems = [...items()];
    const [moved] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, moved);
    setItems(newItems);
    props.onChange?.(Object.fromEntries(newItems.map((i) => [i.key, i.value])));
  };

  const onDragOver = (e: DragEvent) => e.preventDefault();

  return (
    <div class={styles.kvContainer}>
      <For each={items()}>
        {(item, index) => (
          <div
            class={styles.kvRow}
            draggable
            onDragStart={(e) => onDragStart(e, index())}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, index())}
          >
            <input
              class={styles.kvInput}
              placeholder="Key"
              value={item.key}
              onInput={(e) =>
                updateItem(index(), e.currentTarget.value, item.value)
              }
            />
            <input
              class={styles.kvInput}
              placeholder="Value"
              value={item.value}
              onInput={(e) =>
                updateItem(index(), item.key, e.currentTarget.value)
              }
            />
            <button
              class={styles.kvRemove}
              onClick={() => removeItem(index())}
              type="button"
              aria-label="Eliminar fila"
            >
              ✕
            </button>
          </div>
        )}
      </For>
      <button class={styles.kvAdd} onClick={addItem} type="button">
        + Agregar
      </button>
    </div>
  );
}

import { createEffect, createSignal } from "solid-js";
import ModalCommon from "../../common/UI/ModalCommon";
import type {
  RifaCreate,
  RifaOut,
  RifaUpdate,
} from "../../../domain/personEvents";
import { createRifa, updateRifa } from "../../../infrastructure/personEvents";
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

export default function ModCURifa(props: ModCURifaProps) {
  const [nombre, setNombre] = createSignal("");
  const [fechaInicio, setFechaInicio] = createSignal("");
  const [fechaFin, setFechaFin] = createSignal("");
  const [numeroInicio, setNumeroInicio] = createSignal("1");
  const [numeroFin, setNumeroFin] = createSignal("100");
  const [error, setError] = createSignal("");
  const [metadata, setMetadata] = createSignal<Record<string, any>>({});
  const [loading, setLoading] = createSignal(false);

  createEffect(() => {
    const rifa = props.initialData;

    if (rifa) {
      setNombre(rifa.nombre ?? "");
      setFechaInicio(toDateInputValue(rifa.fecha_inicio));
      setFechaFin(toDateInputValue(rifa.fecha_fin));
      setNumeroInicio(String(rifa.numero_inicio ?? 1));
      setNumeroFin(String(rifa.numero_fin ?? 100));
      setMetadata(rifa.metadata ?? {});
      return;
    }

    setNombre("");
    setFechaInicio("");
    setFechaFin("");
    setNumeroInicio("1");
    setNumeroFin("100");
    setMetadata({});
    setError("");
  });

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
        const response = await updateRifa(props.initialData.id, payload);
        console.log("Rifa actualizada:", response);
        // console.log("redirigir o refrescar lista aquí");
      } else {
        const payload: RifaCreate = basePayload;
        const response = await createRifa(payload);
        console.log("Rifa creada:", response);
        // console.log("redirigir o refrescar lista aquí");
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
      <form class={styles.modalContent} onSubmit={handleSubmit}>
        <input
          class={styles.modalInput}
          type="text"
          placeholder="Nombre de la rifa"
          value={nombre()}
          onInput={(e) => setNombre(e.currentTarget.value)}
        />

        <input
          class={styles.modalInput}
          type="date"
          value={fechaInicio()}
          onInput={(e) => setFechaInicio(e.currentTarget.value)}
        />

        <input
          class={styles.modalInput}
          type="date"
          value={fechaFin()}
          onInput={(e) => setFechaFin(e.currentTarget.value)}
        />

        <input
          class={styles.modalInput}
          type="number"
          placeholder="Número inicio"
          value={numeroInicio()}
          onInput={(e) => setNumeroInicio(e.currentTarget.value)}
        />

        <input
          class={styles.modalInput}
          type="number"
          placeholder="Número fin"
          value={numeroFin()}
          onInput={(e) => setNumeroFin(e.currentTarget.value)}
        />

        <KVList data={metadata()} onChange={setMetadata} />

        {error() && <span class={styles.errorMessage}>{error()}</span>}

        <button class={styles.modalButton} type="submit" disabled={loading()}>
          {loading()
            ? props.initialData
              ? "Actualizando..."
              : "Creando..."
            : props.initialData
              ? "Actualizar Rifa"
              : "Crear Rifa"}
        </button>
      </form>
    </ModalCommon>
  );
}

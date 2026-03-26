import { createSignal } from "solid-js";
import ModalCommon from "../../common/UI/ModalCommon";
import type { RifaCreate } from "../../../domain/personEvents";
import { createRifa } from "../../../infrastructure/personEvents";
import styles from "./ModCURifa.module.css";
import KVList from "../../common/components/KVList";

interface ModCURifaProps {
  onClose: () => void;
}

export default function ModCURifa(props: ModCURifaProps) {
  const [nombre, setNombre] = createSignal("");
  const [fechaInicio, setFechaInicio] = createSignal("");
  const [fechaFin, setFechaFin] = createSignal("");
  const [numeroInicio, setNumeroInicio] = createSignal(1);
  const [numeroFin, setNumeroFin] = createSignal(100);
  const [error, setError] = createSignal("");
  const [metadata, setMetadata] = createSignal<Record<string, any>>({});
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    if (!nombre()) {
      setError("El nombre es obligatorio");
      return;
    }

    const payload: RifaCreate = {
      nombre: nombre(),
      fecha_inicio: fechaInicio() || null,
      fecha_fin: fechaFin() || null,
      numero_inicio: numeroInicio(),
      numero_fin: numeroFin(),
      metadata: metadata(),
    };

    try {
      setLoading(true);
      await createRifa(payload);
      setLoading(false);
      props.onClose(); // cerrar modal si se crea correctamente
    } catch (err) {
      setLoading(false);
      setError("Error al crear la rifa");
      console.error(err);
    }
  };

  return (
    <ModalCommon onClose={props.onClose}>
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
          placeholder="Fecha inicio"
          value={fechaInicio()}
          onInput={(e) => setFechaInicio(e.currentTarget.value)}
        />
        <input
          class={styles.modalInput}
          type="date"
          placeholder="Fecha fin"
          value={fechaFin()}
          onInput={(e) => setFechaFin(e.currentTarget.value)}
        />
        <input
          class={styles.modalInput}
          type="number"
          placeholder="Número inicio"
          value={numeroInicio()}
          onInput={(e) => setNumeroInicio(Number(e.currentTarget.value))}
        />
        <input
          class={styles.modalInput}
          type="number"
          placeholder="Número fin"
          value={numeroFin()}
          onInput={(e) => setNumeroFin(Number(e.currentTarget.value))}
        />

        <KVList data={metadata()} onChange={setMetadata} />

        {error() && <span class={styles.errorMessage}>{error()}</span>}

        <button class={styles.modalButton} type="submit" disabled={loading()}>
          {loading() ? "Creando..." : "Crear Rifa"}
        </button>
      </form>
    </ModalCommon>
  );
}

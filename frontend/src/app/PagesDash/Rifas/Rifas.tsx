import { createSignal } from "solid-js";
import ModCURifa from "./ModCURifa";

export default function Rifas() {
  const [showModal, setShowModal] = createSignal(false);
  return (
    <>
      {showModal() ? (
        <ModCURifa
          onClose={() => {
            setShowModal(false);
          }}
        />
      ) : (
        <button
          onclick={() => {
            setShowModal(true);
          }}
        >
          Abrir
        </button>
      )}
    </>
  );
}

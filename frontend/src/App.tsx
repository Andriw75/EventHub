import { createSignal } from "solid-js";

function App() {
  const [count, setCount] = createSignal(1);

  return (
    <>
      <button onClick={() => setCount((count) => count + 1)}>
        Adios Mundo x {count()}
      </button>
    </>
  );
}

export default App;

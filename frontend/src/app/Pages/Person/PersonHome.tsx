import { useParams, useNavigate } from "@solidjs/router";
import { createResource, For } from "solid-js";




export default function PersonHome() {
  const params = useParams();
  const navigate = useNavigate();

  const [personData] = createResource(() => params.person, fetchPerson);

  return (
    <div style={{ padding: "1rem" }}>
      {personData.loading && <p>Cargando usuario...</p>}
      {personData.error && <p>Error al cargar usuario</p>}
      {personData() ? (
        <>
          <h1>Bienvenido, {personData()?.name}</h1>
          <p>Selecciona un evento:</p>
          <ul>
            <For each={personData()?.events}>
              {(ev) => (
                <li>
                  <button
                    onClick={() => navigate(`/${params.person}/${ev.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {ev.title}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </>
      ) : (
        !personData.loading && <p>Usuario no encontrado</p>
      )}
    </div>
  );
}

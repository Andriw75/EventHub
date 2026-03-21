import { useParams } from "@solidjs/router";
import { createResource } from "solid-js";

async function fetchPerson(name: string) {
  console.log(name);
}

export default function Person() {
  const params = useParams();

  const [data] = createResource(() => params.person, fetchPerson);

  return (
    <div>
      <h1>Perfil de {params.person}</h1>

      {data.loading && <p>Cargando...</p>}
      {data.error && <p>Error al cargar</p>}

      {/* {data() && <pre>{JSON.stringify(data(), null, 2)}</pre>} */}
    </div>
  );
}

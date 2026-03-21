import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import FloatingInput from "../../common/components/FloatingInput";
import styles from "./CreateAccount.module.css";

export default function CreateAccount() {
  const navigate = useNavigate();

  const [correo, setCorreo] = createSignal("");
  const [name, setName] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: correo(),
          name: name(),
          password: password(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al crear usuario");
      }

      alert("Cuenta creada correctamente");
      navigate("/login");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error desconocido");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class={styles.container}>
      <h1>Create Account</h1>

      <form onSubmit={handleSubmit} class={styles.form}>
        <FloatingInput
          placeholder="Correo"
          type="email"
          value={correo()}
          onInput={setCorreo}
        />

        <FloatingInput
          placeholder="Nombre"
          type="text"
          value={name()}
          onInput={setName}
        />

        <FloatingInput
          placeholder="Contraseña"
          type="password"
          value={password()}
          onInput={setPassword}
        />

        <button class={styles.button} disabled={loading()}>
          {loading() ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      {error() && <p class={styles.error}>{error()}</p>}

      <p class={styles.link}>
        ¿Ya tienes cuenta?{" "}
        <span onClick={() => navigate("/login")}>Iniciar sesión</span>
      </p>
    </div>
  );
}

import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import FloatingInput from "../../common/components/FloatingInput";
import styles from "./Login.module.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const handleLogin = () => {
    console.log("Correo:", email());
    console.log("Contraseña:", password());
  };

  return (
    <div class={styles.container}>
      <h1>Login</h1>

      <FloatingInput
        placeholder="Correo"
        type="email"
        value={email()}
        onInput={setEmail}
      />

      <FloatingInput
        placeholder="Contraseña"
        type="password"
        value={password()}
        onInput={setPassword}
      />

      <button class={styles.button} onClick={handleLogin}>
        Iniciar sesión
      </button>

      <p class={styles.link}>
        ¿No tienes cuenta?{" "}
        <span onClick={() => navigate("/create-account")}>Crear cuenta</span>
      </p>
    </div>
  );
}

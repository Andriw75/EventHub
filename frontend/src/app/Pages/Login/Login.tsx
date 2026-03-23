import { createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import FloatingInput from "../../common/components/FloatingInput";
import styles from "./Login.module.css";
import { useAuth } from "../../context/auth";
import LoadingLoop from "../../common/IconSVG/LoadingLoop";

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loadingLogin, setloadingLogin] = createSignal(false);

  const handleLogin = async () => {
    if (loadingLogin()) return;

    setError("");
    setloadingLogin(true);

    const result = await login(email(), password());

    if (result) {
      setError("CARGADO");
    } else {
      setError("Correo o contraseña incorrectos");
    }

    setloadingLogin(false);
  };
  onMount(async () => {
    console.log(user());
  });

  return (
    <div class={styles.container}>
      <h1>Login</h1>
      <FloatingInput
        placeholder="Correo"
        type="email"
        value={email()}
        onInput={setEmail}
        disabled={loadingLogin()}
      />
      <FloatingInput
        placeholder="Contraseña"
        type="password"
        value={password()}
        onInput={setPassword}
        disabled={loadingLogin()}
      />
      {error() && <p class={styles.error}>{error()}</p>}{" "}
      <button
        class={`${styles.button} ${loadingLogin() ? styles.buttonLoading : ""}`}
        onClick={handleLogin}
        disabled={loadingLogin()}
      >
        {loadingLogin() ? <LoadingLoop /> : "Iniciar sesión"}
      </button>
      <p class={styles.link}>
        ¿No tienes cuenta?{" "}
        <span onClick={() => navigate("/create-account")}>Crear cuenta</span>
      </p>
    </div>
  );
}

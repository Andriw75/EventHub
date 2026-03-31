//TODO: VALIDAR QUE EXISTA USER NAME Y PASSWORD PARA HABILITAR EL BOTON DE LOGIN
import { createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import styles from "./Login.module.css";
import { useAuth } from "../../context/auth";
import LoadingLoop from "../../common/IconSVG/LoadingLoop";

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleLogin = async () => {
    if (loading()) return;
    if (!username() || !password()) return;

    setError("");
    setLoading(true);

    const result = await login(username(), password());

    if (result) {
      navigate(`/${user()?.name}/dashboard`);
    } else {
      setError("Usuario o contraseña incorrectos");
    }

    setLoading(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  onMount(() => {
    if (user()) {
      navigate(`/${user()?.name}/dashboard`);
    }
  });

  return (
    <div class={styles.page}>
      {/* Panel izquierdo decorativo */}
      <div class={styles.hero}>
        <div class={styles.heroPattern} />

        <div class={styles.heroTop}>
          <div class={styles.logoBadge}>
            <div class={styles.logoDot} />
            Panel de gestión
          </div>
        </div>

        <div class={styles.heroCenter}>
          <h1 class={styles.heroHeading}>
            Gestiona tus
            <br />
            eventos con
            <br />
            precisión.
          </h1>
          <p class={styles.heroSub}>
            Rifas, subastas y ventas limitadas en un solo lugar.
          </p>
        </div>

        <div class={styles.heroBottom}>
          <span class={styles.heroPill}>Rifas</span>
          <span class={styles.heroPill}>Subastas</span>
          <span class={styles.heroPill}>Ventas</span>
        </div>
      </div>

      {/* Panel del formulario */}
      <div class={styles.formSide}>
        <div class={styles.formBox}>
          <div class={styles.formHeader}>
            <p class={styles.greeting}>Bienvenido de vuelta</p>
            <h2 class={styles.formTitle}>Iniciar sesión</h2>
          </div>

          <div class={styles.fields}>
            <div class={styles.field}>
              <label class={styles.label}>Usuario</label>
              <input
                class={styles.input}
                type="text"
                placeholder="tu_usuario"
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={loading()}
                autocomplete="username"
              />
            </div>

            <div class={styles.field}>
              <label class={styles.label}>Contraseña</label>
              <input
                class={styles.input}
                type="password"
                placeholder="••••••••"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={loading()}
                autocomplete="current-password"
              />
            </div>
          </div>

          <button
            class={styles.submitBtn}
            onClick={handleLogin}
            disabled={loading() || !username() || !password()}
          >
            {loading() ? <LoadingLoop width="1.1em" height="1.1em" /> : "Entrar"}
          </button>

          {error() && <p class={styles.error}>{error()}</p>}

          <p class={styles.footer}>
            ¿No tienes cuenta?{" "}
            <span
              class={styles.footerLink}
              onClick={() => navigate("/create-account")}
            >
              Crear cuenta
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
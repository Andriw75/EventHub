import { createSignal, createEffect, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import styles from "./CreateAccount.module.css";
import { authService } from "../../../infrastructure/auth";
import { useAuth } from "../../context/auth";
import LoadingLoop from "../../common/IconSVG/LoadingLoop";

export default function CreateAccount() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [correo, setCorreo] = createSignal("");
  const [name, setName] = createSignal("");
  const [password, setPassword] = createSignal("");

  const [correoError, setCorreoError] = createSignal("");
  const [nameError, setNameError] = createSignal("");
  const [passwordError, setPasswordError] = createSignal("");

  const [message, setMessage] = createSignal("");
  const [messageType, setMessageType] = createSignal<"success" | "info">("info");
  const [loading, setLoading] = createSignal(false);

  const [touchedCorreo, setTouchedCorreo] = createSignal(false);
  const [touchedName, setTouchedName] = createSignal(false);
  const [touchedPassword, setTouchedPassword] = createSignal(false);

  const validateCorreo = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return "El correo es obligatorio";
    if (!emailRegex.test(value)) return "Correo inválido";
    return "";
  };

  const validateName = (value: string) => {
    if (!value) return "El nombre es obligatorio";
    if (value.length >= 50) return "Máximo 50 caracteres";
    if (!/^[a-zA-Z0-9_-]+$/.test(value))
      return "Solo letras, números, guiones y guiones bajos";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "La contraseña es obligatoria";
    if (value.length < 6) return "Mínimo 6 caracteres";
    if (value.length >= 50) return "Máximo 50 caracteres";
    if (!/[A-Z]/.test(value)) return "Debe incluir una mayúscula";
    if (!/[a-z]/.test(value)) return "Debe incluir una minúscula";
    if (!/\d/.test(value)) return "Debe incluir un número";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value))
      return "Debe incluir un símbolo especial";
    return "";
  };

  createEffect(() => {
    setCorreoError(validateCorreo(correo()));
    setNameError(validateName(name()));
    setPasswordError(validatePassword(password()));
  });

  const isFormValid = () =>
    !correoError() && !nameError() && !passwordError() &&
    correo() && name() && password();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setTouchedCorreo(true);
    setTouchedName(true);
    setTouchedPassword(true);

    if (!isFormValid()) return;

    setMessage("");
    setLoading(true);

    try {
      const { success, detail } = await authService.register(
        correo(),
        name(),
        password(),
      );

      if (success) {
        setMessageType("success");
        setMessage(
          "Revisa tu correo para confirmar la cuenta. Luego inicia sesión.",
        );
      } else {
        setMessageType("info");
        setMessage(detail || "No se pudo crear la cuenta. Intenta de nuevo.");
      }
    } catch (err: unknown) {
      setMessageType("info");
      if (err instanceof Error) setMessage(err.message);
      else setMessage("Ocurrió un error desconocido");
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    if (user()) navigate(`/${user()?.name}/dashboard`);
  });

  return (
    <div class={styles.page}>
      {/* Panel izquierdo */}
      <div class={styles.hero}>
        <div class={styles.heroPattern} />

        <div class={styles.heroTop}>
          <div class={styles.logoBadge}>
            <div class={styles.logoDot} />
            Nueva cuenta
          </div>
        </div>

        <div class={styles.heroCenter}>
          <h1 class={styles.heroHeading}>
            Empieza a
            <br />
            gestionar
            <br />
            hoy.
          </h1>
          <p class={styles.heroSub}>
            Crea tu cuenta y accede a todas las herramientas de gestión de eventos.
          </p>
        </div>

        <div class={styles.heroFeatures}>
          <div class={styles.heroFeature}>
            <div class={styles.featureIcon}>🎟</div>
            Crea y gestiona rifas fácilmente
          </div>
          <div class={styles.heroFeature}>
            <div class={styles.featureIcon}>🔨</div>
            Organiza subastas en tiempo real
          </div>
          <div class={styles.heroFeature}>
            <div class={styles.featureIcon}>⏳</div>
            Controla ventas con límite de stock
          </div>
        </div>
      </div>

      {/* Panel del formulario */}
      <div class={styles.formSide}>
        <div class={styles.formBox}>
          <div class={styles.formHeader}>
            <p class={styles.greeting}>Registro</p>
            <h2 class={styles.formTitle}>Crear cuenta</h2>
          </div>

          <form onSubmit={handleSubmit} novalidate>
            <div class={styles.fields}>
              <div class={styles.field}>
                <label class={styles.label}>Correo electrónico</label>
                <input
                  class={`${styles.input} ${touchedCorreo() && correoError() ? styles.inputError : ""}`}
                  type="email"
                  placeholder="tu@correo.com"
                  value={correo()}
                  onInput={(e) => setCorreo(e.currentTarget.value)}
                  onBlur={() => setTouchedCorreo(true)}
                  disabled={loading()}
                  autocomplete="email"
                />
                <Show when={touchedCorreo() && correoError()}>
                  <p class={styles.errorHint}>⚠ {correoError()}</p>
                </Show>
              </div>

              <div class={styles.field}>
                <label class={styles.label}>Nombre de usuario</label>
                <input
                  class={`${styles.input} ${touchedName() && nameError() ? styles.inputError : ""}`}
                  type="text"
                  placeholder="mi_usuario"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  onBlur={() => setTouchedName(true)}
                  disabled={loading()}
                  autocomplete="username"
                />
                <Show when={touchedName() && nameError()}>
                  <p class={styles.errorHint}>⚠ {nameError()}</p>
                </Show>
              </div>

              <div class={styles.field}>
                <label class={styles.label}>Contraseña</label>
                <input
                  class={`${styles.input} ${touchedPassword() && passwordError() ? styles.inputError : ""}`}
                  type="password"
                  placeholder="••••••••"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  onBlur={() => setTouchedPassword(true)}
                  disabled={loading()}
                  autocomplete="new-password"
                />
                <Show when={touchedPassword() && passwordError()}>
                  <p class={styles.errorHint}>⚠ {passwordError()}</p>
                </Show>
              </div>
            </div>

            <button
              class={styles.submitBtn}
              type="submit"
              disabled={loading()}
            >
              {loading() ? (
                <LoadingLoop width="1.1em" height="1.1em" />
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <Show when={message()}>
            <p class={`${styles.message} ${styles[messageType()]}`}>
              {message()}
            </p>
          </Show>

          <p class={styles.footer}>
            ¿Ya tienes cuenta?{" "}
            <span
              class={styles.footerLink}
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
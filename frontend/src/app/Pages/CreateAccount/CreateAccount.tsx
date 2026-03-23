import { createSignal, createEffect, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import FloatingInput from "../../common/components/FloatingInput";
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
  const [loading, setLoading] = createSignal(false);

  const validateCorreo = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return "El correo es obligatorio";
    if (!emailRegex.test(value)) return "Correo inválido";
    return "";
  };

  const validateName = (value: string) => {
    if (!value) return "El nombre es obligatorio";
    if (value.length >= 50)
      return "El usuario debe tener menos de 50 caracteres";

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(value)) {
      return "El nombre solo puede contener letras, números, guiones o guiones bajos";
    }

    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "La contraseña es obligatoria";
    if (value.length < 6)
      return "La contraseña debe tener al menos 6 caracteres";
    if (value.length >= 50)
      return "La contraseña debe tener menos de 50 caracteres";
    if (!/[A-Z]/.test(value))
      return "Debe contener al menos una letra mayúscula";
    if (!/[a-z]/.test(value))
      return "Debe contener al menos una letra minúscula";
    if (!/\d/.test(value)) return "Debe contener al menos un número";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value))
      return "Debe contener al menos un símbolo especial";
    return "";
  };

  createEffect(() => {
    setCorreoError(validateCorreo(correo()));
    setNameError(validateName(name()));
    setPasswordError(validatePassword(password()));
  });

  const isFormValid = () => {
    return (
      !correoError() &&
      !nameError() &&
      !passwordError() &&
      correo() &&
      name() &&
      password()
    );
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { success, detail } = await authService.register(
        correo(),
        name(),
        password(),
      );

      if (success) {
        setMessage(
          "Revisa tu correo para confirmar la creación de la cuenta y luego inicia sesión con tus credenciales.",
        );
      } else {
        setMessage(
          detail ||
            "No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.",
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error) setMessage(err.message);
      else setMessage("Ocurrió un error desconocido");
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    console.log(user());
  });

  return (
    <div class={styles.container}>
      <h1>Crear Cuenta</h1>

      <form onSubmit={handleSubmit} class={styles.form}>
        <FloatingInput
          placeholder="Correo"
          type="email"
          value={correo()}
          onInput={setCorreo}
        />
        {correo() && correoError() && (
          <p class={styles.error}>{correoError()}</p>
        )}

        <FloatingInput
          placeholder="Nombre"
          type="text"
          value={name()}
          onInput={setName}
        />
        {name() && nameError() && <p class={styles.error}>{nameError()}</p>}

        <FloatingInput
          placeholder="Contraseña"
          type="password"
          value={password()}
          onInput={setPassword}
        />
        {password() && passwordError() && (
          <p class={styles.error}>{passwordError()}</p>
        )}

        <button class={styles.button} disabled={loading() || !isFormValid()}>
          {loading() ? <LoadingLoop /> : "Crear cuenta"}
        </button>
      </form>

      {message() && <p class={styles.message}>{message()}</p>}

      <p class={styles.link}>
        ¿Ya tienes cuenta?{" "}
        <span
          style={{ cursor: "pointer", color: "var(--color-success)" }}
          onClick={() => navigate("/login")}
        >
          Inicia sesión
        </span>
      </p>
    </div>
  );
}

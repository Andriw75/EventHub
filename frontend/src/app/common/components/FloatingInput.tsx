import { createSignal, createEffect } from "solid-js";
import styles from "./FloatingInput.module.css";

interface FloatingInputProps {
  placeholder: string;
  type?: string;
  value?: string;
  inputClass?: string;
  containerClass?: string;
  ref?: (el: HTMLInputElement) => void;
  onInput?: (value: string) => void;
}

export default function FloatingInput(props: FloatingInputProps) {
  let inputRef: HTMLInputElement | undefined;
  const [isFocused, setIsFocused] = createSignal(false);
  const [value, setValue] = createSignal(props.value || "");

  createEffect(() => {
    if (props.value !== undefined && props.value !== value()) {
      setValue(props.value);
    }
  });

  const handleInput = () => {
    if (inputRef) setValue(inputRef.value);
    if (props.onInput && inputRef) props.onInput(inputRef.value);
    if (props.ref && inputRef) props.ref(inputRef);
  };

  const isActive = () => isFocused() || value() !== "";

  return (
    <div class={`${styles.container} ${props.containerClass || ""}`}>
      <input
        ref={(el) => (inputRef = el)}
        type={props.type || "text"}
        value={value()}
        class={`${styles.input} ${props.inputClass || ""}`}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <label class={`${styles.label} ${isActive() ? styles.labelFocused : ""}`}>
        {props.placeholder}
      </label>
    </div>
  );
}

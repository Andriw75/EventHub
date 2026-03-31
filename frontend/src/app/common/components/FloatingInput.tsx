import { createSignal } from "solid-js";
import styles from "./FloatingInput.module.css";

interface FloatingInputProps {
  placeholder: string;
  type?: string;
  value?: string;
  inputClass?: string;
  containerClass?: string;
  ref?: (el: HTMLInputElement) => void;
  onInput?: (value: string) => void;
  disabled?: boolean;
}

export default function FloatingInput(props: FloatingInputProps) {
  // @ts-ignore
  let inputRef: HTMLInputElement | undefined;
  const [isFocused, setIsFocused] = createSignal(false);

  const handleInput = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    props.onInput?.(target.value);
  };

  const isActive = () => isFocused() || (props.value ?? "") !== "";

  return (
    <div class={`${styles.container} ${props.containerClass || ""}`}>
      <input
        ref={(el) => (inputRef = el)}
        type={props.type || "text"}
        value={props.value || ""}
        disabled={props.disabled}
        class={`
    ${styles.input} 
    ${props.inputClass || ""} 
    ${props.disabled ? styles.disabled : ""}
  `}
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

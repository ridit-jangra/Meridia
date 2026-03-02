import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";

export type TInputType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "search"
  | "url";

export function Input(opts?: {
  type?: TInputType;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  class?: string;
  id?: string;
  name?: string;
  autofocus?: boolean;
  maxlength?: number;
  onChange?: (value: string) => void;
  onInput?: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onBlur?: (value: string) => void;
  onFocus?: (value: string) => void;
}) {
  const input = h("input", {
    class: cn(
      "h-8 w-full px-2.5 text-[13px] rounded-[5px]",
      "border border-input-border bg-input-background text-input-foreground",
      "placeholder:text-input-foreground/40",
      "transition-colors",
      "focus:outline-none focus:ring-1.5 focus:ring-select-border",
      "disabled:opacity-50 disabled:pointer-events-none",
      "read-only:opacity-70 read-only:pointer-events-none",
      opts?.class,
    ),
    attrs: {
      type: opts?.type ?? "text",
      ...(opts?.value !== undefined ? { value: opts.value } : {}),
      ...(opts?.placeholder ? { placeholder: opts.placeholder } : {}),
      ...(opts?.disabled ? { disabled: true } : {}),
      ...(opts?.readonly ? { readonly: true } : {}),
      ...(opts?.id ? { id: opts.id } : {}),
      ...(opts?.name ? { name: opts.name } : {}),
      ...(opts?.autofocus ? { autofocus: true } : {}),
      ...(opts?.maxlength !== undefined
        ? { maxlength: String(opts.maxlength) }
        : {}),
    },
  }) as HTMLInputElement;

  if (opts?.onChange) {
    input.addEventListener("change", () => opts.onChange!(input.value));
  }

  if (opts?.onInput) {
    input.addEventListener("input", () => opts.onInput!(input.value));
  }

  if (opts?.onKeyDown) {
    input.addEventListener("keydown", opts.onKeyDown as EventListener);
  }

  if (opts?.onBlur) {
    input.addEventListener("blur", () => opts.onBlur!(input.value));
  }

  if (opts?.onFocus) {
    input.addEventListener("focus", () => opts.onFocus!(input.value));
  }

  return {
    el: input,
    get value() {
      return input.value;
    },
    setValue(v: string) {
      input.value = v;
    },
    focus() {
      input.focus();
    },
    blur() {
      input.blur();
    },
    setDisabled(v: boolean) {
      input.disabled = v;
    },
    destroy() {
      input.replaceWith(input.cloneNode(true));
    },
  };
}

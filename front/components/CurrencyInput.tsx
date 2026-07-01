import type { ComponentProps } from "react";

export function CurrencyInput({
  id,
  name,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; name: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 dark:text-zinc-400">
        R$
      </span>
      <input
        id={id}
        name={name}
        type="number"
        step="0.01"
        min="0.01"
        required
        className={`w-full rounded-lg border border-zinc-300 py-2 pr-3 pl-9 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 ${className ?? ""}`}
        {...props}
      />
    </div>
  );
}

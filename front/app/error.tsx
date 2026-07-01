"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Algo deu errado
      </h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Não foi possível carregar esta página. Tente novamente em instantes.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
      >
        Tentar novamente
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="max-w-md text-sm text-zinc-600">
          O aplicativo encontrou um erro inesperado. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}

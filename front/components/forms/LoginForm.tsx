"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Entrar</h1>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          {state?.fieldErrors?.email && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.email[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          {state?.fieldErrors?.password && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.password[0]}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/forgot-password" className="underline underline-offset-2">
          Esqueci minha senha
        </Link>
        <p>
          Não tem conta?{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

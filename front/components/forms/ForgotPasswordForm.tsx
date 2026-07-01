"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { forgotPassword } from "@/lib/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPassword, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Esqueci minha senha</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Informe seu e-mail para receber o link de redefinição de senha.
      </p>
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
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? "Enviando..." : "Enviar link"}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Já tem o token?{" "}
        <Link href="/reset-password" className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50">
          Redefinir senha
        </Link>
      </p>
    </div>
  );
}

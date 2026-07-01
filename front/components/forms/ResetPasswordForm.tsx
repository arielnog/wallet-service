"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resetPassword } from "@/lib/actions/auth";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(resetPassword, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Redefinir senha</h1>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="token" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Token
          </label>
          <input
            id="token"
            name="token"
            type="text"
            required
            defaultValue={searchParams.get("token") ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          {state?.fieldErrors?.token && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.token[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="newPassword" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nova senha
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          {state?.fieldErrors?.newPassword && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.newPassword[0]}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? "Salvando..." : "Redefinir senha"}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}

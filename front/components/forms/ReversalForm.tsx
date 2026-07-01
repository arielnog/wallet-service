"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { reversal } from "@/lib/actions/wallet";
import { CurrencyInput } from "@/components/CurrencyInput";

export function ReversalForm() {
  const [state, formAction, pending] = useActionState(reversal, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="transactionId" className="text-sm text-zinc-600 dark:text-zinc-400">
        ID da transação
      </label>
      <input
        id="transactionId"
        name="transactionId"
        type="text"
        required
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {state?.fieldErrors?.transactionId && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.transactionId[0]}</p>
      )}
      <label htmlFor="reversalAmount" className="text-sm text-zinc-600 dark:text-zinc-400">
        Valor
      </label>
      <CurrencyInput id="reversalAmount" name="amount" />
      {state?.fieldErrors?.amount && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.amount[0]}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
      >
        {pending ? "Enviando..." : "Estornar"}
      </button>
    </form>
  );
}

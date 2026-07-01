"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { transfer } from "@/lib/actions/wallet";
import { CurrencyInput } from "@/components/CurrencyInput";
import { RecipientInput } from "@/components/RecipientInput";

export function TransferForm() {
  const [state, formAction, pending] = useActionState(transfer, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="toUserId" className="text-sm text-zinc-600 dark:text-zinc-400">
        ID do destinatário
      </label>
      <RecipientInput id="toUserId" name="toUserId" />
      {state?.fieldErrors?.toUserId && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.toUserId[0]}</p>
      )}
      <label htmlFor="transferAmount" className="text-sm text-zinc-600 dark:text-zinc-400">
        Valor
      </label>
      <CurrencyInput id="transferAmount" name="amount" />
      {state?.fieldErrors?.amount && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.amount[0]}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
      >
        {pending ? "Enviando..." : "Transferir"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createWallet } from "@/lib/actions/wallet";

export function CreateWalletButton() {
  const [state, formAction, pending] = useActionState(createWallet, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
      >
        {pending ? "Criando..." : "Criar carteira"}
      </button>
    </form>
  );
}

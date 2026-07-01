import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { formatCurrency } from "@/lib/format";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { CreateWalletButton } from "@/components/forms/CreateWalletButton";
import { DepositForm } from "@/components/forms/DepositForm";
import { TransferForm } from "@/components/forms/TransferForm";
import { ReversalForm } from "@/components/forms/ReversalForm";

export default async function WalletPage() {
  const { accessToken } = await getSession();
  if (!accessToken) {
    redirect("/login");
  }

  let balance: number | null = null;
  let hasWallet = true;
  let balanceError: string | null = null;

  try {
    const data = await api.getBalance(accessToken);
    balance = data.balance;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      hasWallet = false;
    } else {
      balanceError = err instanceof ApiError ? err.message : "Não foi possível carregar o saldo.";
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Saldo disponível</h2>
        {hasWallet ? (
          <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {balance !== null ? formatCurrency(balance) : "—"}
          </p>
        ) : (
          <div className="mt-2 flex items-center gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Você ainda não tem uma carteira.</p>
            <CreateWalletButton />
          </div>
        )}
        {balanceError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{balanceError}</p>}
      </section>

      <div className="mt-8 flex flex-col gap-4">
        <CollapsibleCard title="Depositar" defaultOpen>
          <DepositForm />
        </CollapsibleCard>
        <CollapsibleCard title="Transferir">
          <TransferForm />
        </CollapsibleCard>
        <CollapsibleCard title="Estornar transação">
          <ReversalForm />
        </CollapsibleCard>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/forms/LogoutButton";

export async function Navbar() {
  const { accessToken } = await getSession();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Wallet
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          {accessToken ? (
            <>
              <Link href="/wallet" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                Carteira
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

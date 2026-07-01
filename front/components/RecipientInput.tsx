"use client";

import { useState, useTransition } from "react";
import { searchUsers } from "@/lib/actions/users";
import type { UserSummary } from "@/lib/api";

export function RecipientInput({ id, name }: { id: string; name: string }) {
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openModal() {
    setIsOpen(true);
    if (users === null) {
      startTransition(async () => {
        try {
          setUsers(await searchUsers());
        } catch {
          setError("Não foi possível carregar os usuários.");
        }
      });
    }
  }

  function selectUser(user: UserSummary) {
    setValue(user.id);
    setIsOpen(false);
  }

  const filtered =
    users?.filter((user) =>
      `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())
    ) ?? [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          id={id}
          name={name}
          type="text"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Buscar usuário
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Selecionar usuário
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Buscar por nome ou e-mail"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <div className="mt-3 max-h-64 overflow-y-auto">
              {isPending && (
                <p className="py-4 text-center text-sm text-zinc-500">Carregando...</p>
              )}
              {error && (
                <p className="py-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              {!isPending && !error && filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-500">Nenhum usuário encontrado.</p>
              )}
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => selectUser(user)}
                      className="flex w-full flex-col items-start rounded-lg px-2 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {user.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

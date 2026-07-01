import "server-only";

const API_BASE_URL = process.env.API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar à API. Verifique se o servidor está em execução.",
      0
    );
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || res.statusText || "Erro inesperado";
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

export type BalanceResponse = {
  balance: number;
};

export type UserSummary = {
  id: string;
  name: string;
  email: string;
};

export const api = {
  health: () => request<{ status: string }>("/auth/health"),

  register: (body: { name: string; email: string; password: string }) =>
    request<unknown>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string, accessToken: string) =>
    request<unknown>(
      "/auth/logout",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      accessToken
    ),

  forgotPassword: (email: string) =>
    request<unknown>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<unknown>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  getUsers: (accessToken: string) => request<UserSummary[]>("/auth/users", {}, accessToken),

  createWallet: (accessToken: string) =>
    request<unknown>("/wallet", { method: "POST" }, accessToken),

  getBalance: (accessToken: string) =>
    request<BalanceResponse>("/wallet/balance", {}, accessToken),

  deposit: (amount: number, accessToken: string) =>
    request<Record<string, unknown>>(
      "/wallet/deposit",
      { method: "POST", body: JSON.stringify({ amount }) },
      accessToken
    ),

  transfer: (toUserId: string, amount: number, accessToken: string) =>
    request<Record<string, unknown>>(
      "/wallet/transfer",
      { method: "POST", body: JSON.stringify({ toUserId, amount }) },
      accessToken
    ),

  reversal: (transactionId: string, amount: number, accessToken: string) =>
    request<Record<string, unknown>>(
      `/wallet/reversal/${transactionId}`,
      { method: "POST", body: JSON.stringify({ amount }) },
      accessToken
    ),
};

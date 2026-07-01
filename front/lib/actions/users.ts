"use server";

import { api, ApiError, type UserSummary } from "@/lib/api";
import { getSession } from "@/lib/session";

export async function searchUsers(): Promise<UserSummary[]> {
  const { accessToken } = await getSession();
  if (!accessToken) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  return api.getUsers(accessToken);
}

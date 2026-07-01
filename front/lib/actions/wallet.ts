"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { formatCurrency } from "@/lib/format";
import {
  DepositSchema,
  ReversalSchema,
  TransferSchema,
  type ActionState,
} from "@/lib/definitions";

async function requireAccessToken(): Promise<string> {
  const { accessToken } = await getSession();
  if (!accessToken) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  return accessToken;
}

function extractTransactionId(payload: Record<string, unknown>): string | null {
  const id = payload.transactionId ?? payload.id;
  return typeof id === "string" ? id : null;
}

export async function createWallet(
  _prevState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  try {
    const accessToken = await requireAccessToken();
    await api.createWallet(accessToken);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível criar a carteira." };
  }
  revalidatePath("/wallet");
  return { success: "Carteira criada com sucesso." };
}

export async function deposit(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = DepositSchema.safeParse({ amount: formData.get("amount") });
  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  let transactionId: string | null = null;
  try {
    const accessToken = await requireAccessToken();
    const data = await api.deposit(validated.data.amount, accessToken);
    transactionId = extractTransactionId(data);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível depositar." };
  }

  revalidatePath("/wallet");
  const amountLabel = formatCurrency(validated.data.amount);
  return {
    success: transactionId
      ? `Depósito de ${amountLabel} realizado com sucesso. ID: ${transactionId}`
      : `Depósito de ${amountLabel} realizado com sucesso.`,
  };
}

export async function transfer(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = TransferSchema.safeParse({
    toUserId: formData.get("toUserId"),
    amount: formData.get("amount"),
  });
  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  let transactionId: string | null = null;
  try {
    const accessToken = await requireAccessToken();
    const data = await api.transfer(validated.data.toUserId, validated.data.amount, accessToken);
    transactionId = extractTransactionId(data);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível transferir." };
  }

  revalidatePath("/wallet");
  const amountLabel = formatCurrency(validated.data.amount);
  return {
    success: transactionId
      ? `Transferência de ${amountLabel} realizada com sucesso. ID: ${transactionId}`
      : `Transferência de ${amountLabel} realizada com sucesso.`,
  };
}

export async function reversal(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = ReversalSchema.safeParse({
    transactionId: formData.get("transactionId"),
    amount: formData.get("amount"),
  });
  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  try {
    const accessToken = await requireAccessToken();
    await api.reversal(validated.data.transactionId, validated.data.amount, accessToken);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível estornar." };
  }

  revalidatePath("/wallet");
  return { success: `Estorno de ${formatCurrency(validated.data.amount)} realizado com sucesso.` };
}

"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearSession, getSession, setSession } from "@/lib/session";
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  type ActionState,
} from "@/lib/definitions";

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  try {
    const data = await api.login(validated.data);
    await setSession(data.accessToken, data.refreshToken);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível entrar." };
  }

  redirect("/wallet");
}

export async function register(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  try {
    await api.register(validated.data);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível criar a conta." };
  }

  return { success: "Conta criada! Você já pode entrar." };
}

export async function logout() {
  const { accessToken, refreshToken } = await getSession();
  try {
    if (accessToken && refreshToken) {
      await api.logout(refreshToken, accessToken);
    }
  } catch {
    // Ignore API failures on logout: the local session is cleared regardless.
  } finally {
    await clearSession();
  }
  redirect("/login");
}

export async function forgotPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validated = ForgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  try {
    await api.forgotPassword(validated.data.email);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível enviar o e-mail." };
  }

  return { success: "Se o e-mail existir, enviamos um link de redefinição." };
}

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validated = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
  });
  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  try {
    await api.resetPassword(validated.data.token, validated.data.newPassword);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível redefinir a senha." };
  }

  return { success: "Senha redefinida! Você já pode entrar." };
}

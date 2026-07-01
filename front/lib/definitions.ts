import * as z from "zod";

export const LoginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z.string().min(1, { error: "Informe sua senha." }),
});

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, { error: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z
    .string()
    .min(8, { error: "A senha deve ter pelo menos 8 caracteres." })
    .regex(/[a-zA-Z]/, { error: "A senha deve conter ao menos uma letra." })
    .regex(/[0-9]/, { error: "A senha deve conter ao menos um número." })
    .regex(/[^a-zA-Z0-9]/, { error: "A senha deve conter ao menos um caractere especial." }),
});

export const ForgotPasswordSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { error: "Informe o token recebido por e-mail." }),
  newPassword: z.string().min(8, { error: "A senha deve ter pelo menos 8 caracteres." }),
});

const AmountSchema = z.coerce
  .number({ error: "Informe um valor válido." })
  .positive({ error: "O valor deve ser maior que zero." });

export const DepositSchema = z.object({
  amount: AmountSchema,
});

export const TransferSchema = z.object({
  toUserId: z.string().min(1, { error: "Informe o ID do destinatário." }),
  amount: AmountSchema,
});

export const ReversalSchema = z.object({
  transactionId: z.string().min(1, { error: "Informe o ID da transação." }),
  amount: AmountSchema,
});

export type ActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      success?: string;
    }
  | undefined;

import { TransactionType } from '../enums/transaction-type.enum';

export interface ReversalJobData {
  reversalId: string;
  originalTransactionId: string;
  walletId: string;
  targetWalletId: string | null;
  amount: number;
  isFullReversal: boolean;
  transactionType: TransactionType;
}

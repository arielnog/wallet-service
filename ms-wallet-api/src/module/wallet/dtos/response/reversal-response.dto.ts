import { TransactionStatus } from "../enums/transaction-status.enum";

export class ReversalResponseDto {
  reversalId: string;
  status: TransactionStatus;
  amount: number;
  message: string;
}

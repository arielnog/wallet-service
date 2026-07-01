import { TransactionType } from "../../enums/transaction-type.enum";
import { TransactionStatus } from "../../enums/transaction-status.enum";
import { TransactionDirection } from "../../enums/transaction-direction.enum";

export class StatementItemDto {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  direction: TransactionDirection;
  amount: number;
  createdAt: Date;
}

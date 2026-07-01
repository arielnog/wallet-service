import { IsDate, IsEnum, IsNumber, IsUUID, Min } from "class-validator";
import { TransactionStatus } from "../../enums/transaction-status.enum";

export class TransferResponseDto {
  @IsUUID()
  transactionId!: string;

  @IsEnum(TransactionStatus)
  status!: TransactionStatus;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsUUID()
  receiverWalletId!: string;

  @IsDate()
  createdAt!: Date;
}

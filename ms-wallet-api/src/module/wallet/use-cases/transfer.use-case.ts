import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TransactionStatus } from "../enums/transaction-status.enum";
import { TransactionType } from "../enums/transaction-type.enum";
import { Transaction } from "../entities/transaction.entity";
import { DataSource, Repository } from "typeorm";
import { Wallet } from "../entities/wallet.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { TransferDto } from "../dtos/transfer.dto";
import { TransferResponseDto } from "../dtos/response/transfer-response.dto";

@Injectable()
export class TransferUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(fromUserId: string, {toUserId, amount}: TransferDto): Promise<TransferResponseDto> {
    if (fromUserId === toUserId) throw new BadRequestException('Not allowed to transfer to the same user');

    return this.dataSource.transaction(async (manager): Promise<TransferResponseDto> => {

      const [senderWallet, receiverWallet] = await Promise.all([
        manager.findOneBy(Wallet, { userId: fromUserId }),
        manager.findOneBy(Wallet, { userId: toUserId }),
      ]);

      if (!senderWallet || !receiverWallet) throw new NotFoundException('Wallet not found');

      if (senderWallet.isInsufficientBalance(amount)) {
        throw new BadRequestException('Insufficient balance for the transfer');
      }

      const transaction = await manager.save(
        manager.create(Transaction, {
          walletId: senderWallet.id,
          amount,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          targetWalletId: receiverWallet.id,
        }),
      );

      await manager.decrement(Wallet, { id: senderWallet.id }, 'balance', amount);
      await manager.increment(Wallet, { id: receiverWallet.id }, 'balance', amount);

      return {
        amount: transaction.amount,
        receiverWalletId: transaction.targetWalletId,
      };
    });
  }
}

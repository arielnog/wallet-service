import { Injectable, NotFoundException } from "@nestjs/common";
import { Wallet } from "../entities/wallet.entity";
import { DataSource, Repository } from "typeorm";
import { Transaction } from "../entities/transaction.entity";
import { TransactionType } from "../enums/transaction-type.enum";
import { TransactionStatus } from "../enums/transaction-status.enum";
import { DepositDto } from "../dtos/deposit.dto";

@Injectable()
export class DepositUseCase {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId, {amount}: DepositDto) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOneBy(Wallet, { userId });
      if (!wallet) throw new NotFoundException('Wallet not found for the given user ID');

      const transaction = await manager.save(
        manager.create(Transaction, {
          walletId: wallet.id,
          amount,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
        }),
      );

     await manager.increment(Wallet, { id: wallet.id }, 'balance', amount);

      return transaction;
    });
  }
}

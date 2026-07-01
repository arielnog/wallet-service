import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { Wallet } from "../entities/wallet.entity";
import { Transaction } from "../entities/transaction.entity";
import { TransactionType } from "../enums/transaction-type.enum";
import { TransactionDirection } from "../enums/transaction-direction.enum";
import { StatementQueryDto } from "../dtos/statement-query.dto";
import { StatementItemDto } from "../dtos/response/statement-response.dto";

@Injectable()
export class GetStatementUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async execute(userId: string, { startDate, endDate }: StatementQueryDto): Promise<StatementItemDto[]> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found for the given user ID');

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) throw new BadRequestException('startDate must not be after endDate');

    const transactions = await this.transactionRepo.find({
      where: [
        { walletId: wallet.id, createdAt: Between(start, end) },
        { targetWalletId: wallet.id, createdAt: Between(start, end) },
      ],
      order: { createdAt: 'DESC' },
    });

    const originalTypeById = await this.getOriginalTypeByReversalTransactionId(transactions);

    return transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      direction: this.resolveDirection(transaction, wallet.id, originalTypeById),
      amount: Number(transaction.amount),
      createdAt: transaction.createdAt,
    }));
  }

  private async getOriginalTypeByReversalTransactionId(
    transactions: Transaction[],
  ): Promise<Map<string, TransactionType>> {
    const relatedIds = transactions
      .filter((t) => t.type === TransactionType.REVERSAL)
      .map((t) => t.relatedTransactionId);

    if (!relatedIds.length) return new Map();

    const originals = await this.transactionRepo.findBy({ id: In(relatedIds) });
    return new Map(originals.map((t) => [t.id, t.type]));
  }

  private resolveDirection(
    transaction: Transaction,
    walletId: string,
    originalTypeById: Map<string, TransactionType>,
  ): TransactionDirection {
    if (transaction.targetWalletId === walletId) return TransactionDirection.IN;

    if (transaction.type === TransactionType.REVERSAL) {
      const originalType = originalTypeById.get(transaction.relatedTransactionId);
      return originalType === TransactionType.TRANSFER ? TransactionDirection.IN : TransactionDirection.OUT;
    }

    return transaction.type === TransactionType.DEPOSIT ? TransactionDirection.IN : TransactionDirection.OUT;
  }
}

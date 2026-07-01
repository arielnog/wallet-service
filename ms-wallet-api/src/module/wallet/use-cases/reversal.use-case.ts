import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Wallet } from '../entities/wallet.entity';
import { InjectRepository } from "@nestjs/typeorm";
import { Transaction } from "../entities/transaction.entity";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { TransactionStatus } from "../enums/transaction-status.enum";
import { TransactionType } from "../enums/transaction-type.enum";
import { ReversalDto } from "../dtos/reversal.dto";
import { ReversalJobData } from "../types/reversal-job.type";
import { ReversalResponseDto } from "../dtos/reversal-response.dto";

@Injectable()
export class ReversalUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectQueue('reversal')
    private readonly reversalQueue: Queue<ReversalJobData>,
  ) {}

  async execute(transactionId: string, userId: string, { amount }: ReversalDto): Promise<ReversalResponseDto> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
      relations: { wallet: true },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    if (transaction.wallet.userId !== userId) {
      throw new ForbiddenException('Not allowed to reverse this transaction');
    }

    if (transaction.isForbiddenToReverse()) {
      throw new BadRequestException('Transaction cannot be reversed');
    }
    
    const previousReversals = await this.transactionRepo.find({
      where: [
        { relatedTransactionId: transactionId, type: TransactionType.REVERSAL, status: TransactionStatus.COMPLETED },
        { relatedTransactionId: transactionId, type: TransactionType.REVERSAL, status: TransactionStatus.PENDING },
      ],
    });

    const { reversalAmount, isFullReversal } = this.calculateReversalAmount(
      Number(transaction.amount),
      previousReversals,
      amount,
    );

    const reversal = await this.transactionRepo.save(
      this.transactionRepo.create({
        walletId: transaction.walletId,
        amount: reversalAmount,
        type: TransactionType.REVERSAL,
        status: TransactionStatus.PENDING,
        relatedTransactionId: transaction.id,
      }),
    );

    await this.dispatchReversalJob(reversal, transaction, reversalAmount, isFullReversal);

    return {
      reversalId: reversal.id,
      status: TransactionStatus.PENDING,
      amount: reversalAmount,
      message: 'Reversal request has been queued for processing',
    };
  }

  private calculateReversalAmount(
    originalAmount: number,
    previousReversals: Transaction[],
    amount?: number,
  ): { reversalAmount: number; isFullReversal: boolean } {
    const alreadyReversed = previousReversals.reduce(
      (sum, r) => sum + Number(r.amount), 0,
    );

    const maxReversable = originalAmount - alreadyReversed;

    if (maxReversable <= 0) {
      throw new BadRequestException('Transaction has already been fully reversed');
    }

    const reversalAmount = amount ?? maxReversable;

    if (reversalAmount > maxReversable) {
      throw new BadRequestException(
        `Maximum reversable amount: ${maxReversable}`,
      );
    }

    return { reversalAmount, isFullReversal: reversalAmount === maxReversable };
  }

  private async dispatchReversalJob(
    reversal: Transaction,
    transaction: Transaction,
    amount: number,
    isFullReversal: boolean,
  ): Promise<void> {
    await this.reversalQueue.add(
      'process-reversal',
      {
        reversalId: reversal.id,
        originalTransactionId: transaction.id,
        walletId: transaction.walletId,
        targetWalletId: transaction.targetWalletId,
        amount,
        isFullReversal,
        transactionType: transaction.type,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }
}
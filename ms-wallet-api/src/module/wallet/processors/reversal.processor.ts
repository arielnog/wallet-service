import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Wallet } from "../entities/wallet.entity";
import { DataSource, Repository } from "typeorm";
import { Transaction } from "../entities/transaction.entity";
import { TransactionType } from "../enums/transaction-type.enum";
import { Job } from "bullmq";
import { TransactionStatus } from "../enums/transaction-status.enum";
import { ReversalJobData } from "../types/reversal-job.type";

@Processor('reversal')
export class ReversalProcessor extends WorkerHost {
  private readonly logger = new Logger(ReversalProcessor.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<ReversalJobData>) {
    const { 
      reversalId, 
      originalTransactionId, 
      walletId, 
      targetWalletId, 
      amount, 
      isFullReversal, 
      transactionType 
    } = job.data;
    
    const existing = await this.transactionRepo.findOneBy({ id: reversalId });
    
    if (existing?.isCompleted()) return;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (transactionType === TransactionType.TRANSFER) {
        const [sender, receiver] = await Promise.all([
          queryRunner.manager.findOneBy(Wallet, { id: walletId }),
          queryRunner.manager.findOneBy(Wallet, { id: targetWalletId! }),
        ]);

        if (!sender || !receiver) throw new Error('Wallet not found');
        if (receiver.isInsufficientBalance(amount)) throw new Error('Insufficient balance');

        await Promise.all([
          queryRunner.manager.update(Wallet, sender.id, {
            balance: Number(sender.balance) + amount,
          }),
          queryRunner.manager.update(Wallet, receiver.id, {
            balance: Number(receiver.balance) - amount,
          }),
        ]);
      } else {
        const wallet = await queryRunner.manager.findOneBy(Wallet, { id: walletId });
        if (!wallet) throw new Error('Wallet not found');
        if (wallet.isInsufficientBalance(amount)) throw new Error('Insufficient balance');

        await queryRunner.manager.update(Wallet, wallet.id, {
          balance: Number(wallet.balance) - amount,
        });
      }

      await queryRunner.manager.update(Transaction, reversalId, {
        status: TransactionStatus.COMPLETED,
      });

      if (isFullReversal) {
        await queryRunner.manager.update(Transaction, originalTransactionId, {
          status: TransactionStatus.REVERSED,
        });
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();

      try {
        await this.transactionRepo.update(reversalId, {
          status: TransactionStatus.FAILED,
        });
      } catch (updateErr) {
        this.logger.error(
          `Failed to mark reversal ${reversalId} as FAILED after processing error`,
          updateErr instanceof Error ? updateErr.stack : updateErr,
        );
      }

      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

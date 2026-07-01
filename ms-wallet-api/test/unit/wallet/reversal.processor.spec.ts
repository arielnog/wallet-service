import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { Wallet } from '@/module/wallet/entities/wallet.entity';
import { Transaction } from '@/module/wallet/entities/transaction.entity';
import { TransactionType } from '@/module/wallet/enums/transaction-type.enum';
import { TransactionStatus } from '@/module/wallet/enums/transaction-status.enum';
import { ReversalJobData } from '@/module/wallet/types/reversal-job.type';
import { ReversalProcessor } from '@/module/wallet/processors/reversal.processor';

const mockTransactionRepository = () => ({
  findOneBy: jest.fn(),
  update: jest.fn(),
});

const mockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    findOneBy: jest.fn(),
    update: jest.fn(),
  },
});

const createWallet = (overrides: Partial<Wallet> = {}): Wallet =>
  Object.assign(new Wallet(), { id: 'wallet-1', userId: 'user-1', balance: 100, ...overrides });

const createTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  Object.assign(new Transaction(), {
    id: 'reversal-1',
    status: TransactionStatus.PENDING,
    ...overrides,
  });

const jobWith = (overrides: Partial<ReversalJobData> = {}): Job<ReversalJobData> =>
  ({
    data: {
      reversalId: 'reversal-1',
      originalTransactionId: 'tx-1',
      walletId: 'wallet-1',
      targetWalletId: null,
      amount: 30,
      isFullReversal: true,
      transactionType: TransactionType.DEPOSIT,
      ...overrides,
    },
  }) as Job<ReversalJobData>;

describe('ReversalProcessor', () => {
  let processor: ReversalProcessor;
  let transactionRepo: ReturnType<typeof mockTransactionRepository>;
  let queryRunner: ReturnType<typeof mockQueryRunner>;
  let dataSource: { createQueryRunner: jest.Mock };

  beforeEach(async () => {
    queryRunner = mockQueryRunner();
    dataSource = { createQueryRunner: jest.fn(() => queryRunner) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReversalProcessor,
        { provide: getRepositoryToken(Wallet), useValue: {} },
        { provide: getRepositoryToken(Transaction), useFactory: mockTransactionRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    processor = module.get(ReversalProcessor);
    transactionRepo = module.get(getRepositoryToken(Transaction));
  });

  afterEach(() => jest.clearAllMocks());

  describe('process', () => {
    it('should skip processing when the reversal has already been completed', async () => {
      transactionRepo.findOneBy.mockResolvedValue(
        createTransaction({ status: TransactionStatus.COMPLETED }),
      );

      await processor.process(jobWith());

      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should debit the wallet and complete the reversal for a non-transfer transaction', async () => {
      transactionRepo.findOneBy.mockResolvedValue(createTransaction());
      queryRunner.manager.findOneBy.mockResolvedValue(createWallet({ balance: 100 }));

      await processor.process(jobWith({ amount: 30, isFullReversal: true }));

      expect(queryRunner.manager.update).toHaveBeenCalledWith(Wallet, 'wallet-1', { balance: 70 });
      expect(queryRunner.manager.update).toHaveBeenCalledWith(Transaction, 'reversal-1', {
        status: TransactionStatus.COMPLETED,
      });
      expect(queryRunner.manager.update).toHaveBeenCalledWith(Transaction, 'tx-1', {
        status: TransactionStatus.REVERSED,
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should not mark the original transaction as reversed on a partial reversal', async () => {
      transactionRepo.findOneBy.mockResolvedValue(createTransaction());
      queryRunner.manager.findOneBy.mockResolvedValue(createWallet({ balance: 100 }));

      await processor.process(jobWith({ amount: 30, isFullReversal: false }));

      expect(queryRunner.manager.update).not.toHaveBeenCalledWith(Transaction, 'tx-1', {
        status: TransactionStatus.REVERSED,
      });
    });

    it('should credit the sender and debit the receiver for a transfer reversal', async () => {
      transactionRepo.findOneBy.mockResolvedValue(createTransaction());
      const sender = createWallet({ id: 'wallet-1', balance: 20 });
      const receiver = createWallet({ id: 'wallet-2', balance: 50 });
      queryRunner.manager.findOneBy
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(receiver);

      await processor.process(
        jobWith({
          transactionType: TransactionType.TRANSFER,
          walletId: 'wallet-1',
          targetWalletId: 'wallet-2',
          amount: 30,
        }),
      );

      expect(queryRunner.manager.update).toHaveBeenCalledWith(Wallet, 'wallet-1', { balance: 50 });
      expect(queryRunner.manager.update).toHaveBeenCalledWith(Wallet, 'wallet-2', { balance: 20 });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should roll back and mark the reversal as FAILED when a wallet is missing', async () => {
      transactionRepo.findOneBy.mockResolvedValue(createTransaction());
      queryRunner.manager.findOneBy.mockResolvedValue(null);

      await expect(processor.process(jobWith())).rejects.toThrow('Wallet not found');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(transactionRepo.update).toHaveBeenCalledWith('reversal-1', {
        status: TransactionStatus.FAILED,
      });
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should roll back and mark the reversal as FAILED on insufficient balance for a transfer reversal', async () => {
      transactionRepo.findOneBy.mockResolvedValue(createTransaction());
      const sender = createWallet({ id: 'wallet-1', balance: 20 });
      const receiver = createWallet({ id: 'wallet-2', balance: 10 });
      queryRunner.manager.findOneBy
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(receiver);

      await expect(
        processor.process(
          jobWith({
            transactionType: TransactionType.TRANSFER,
            walletId: 'wallet-1',
            targetWalletId: 'wallet-2',
            amount: 30,
          }),
        ),
      ).rejects.toThrow('Insufficient balance');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(transactionRepo.update).toHaveBeenCalledWith('reversal-1', {
        status: TransactionStatus.FAILED,
      });
    });
  });
});

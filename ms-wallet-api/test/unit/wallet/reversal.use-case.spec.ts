import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Wallet } from '@/module/wallet/entities/wallet.entity';
import { Transaction } from '@/module/wallet/entities/transaction.entity';
import { TransactionType } from '@/module/wallet/enums/transaction-type.enum';
import { TransactionStatus } from '@/module/wallet/enums/transaction-status.enum';
import { ReversalUseCase } from '@/module/wallet/use-cases/reversal.use-case';

const mockWalletRepository = () => ({});

const mockTransactionRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data) => data),
});

const mockQueue = () => ({
  add: jest.fn(),
});

const createWallet = (overrides: Partial<Wallet> = {}): Wallet =>
  Object.assign(new Wallet(), { id: 'wallet-1', userId: 'user-1', balance: 0, ...overrides });

const wallet = createWallet();

const createTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  Object.assign(new Transaction(), {
    id: 'tx-1',
    amount: 100,
    walletId: wallet.id,
    targetWalletId: null,
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.COMPLETED,
    wallet,
    ...overrides,
  });

describe('ReversalUseCase', () => {
  let useCase: ReversalUseCase;
  let transactionRepo: ReturnType<typeof mockTransactionRepository>;
  let queue: ReturnType<typeof mockQueue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReversalUseCase,
        { provide: getRepositoryToken(Wallet), useFactory: mockWalletRepository },
        { provide: getRepositoryToken(Transaction), useFactory: mockTransactionRepository },
        { provide: getQueueToken('reversal'), useFactory: mockQueue },
      ],
    }).compile();

    useCase = module.get(ReversalUseCase);
    transactionRepo = module.get(getRepositoryToken(Transaction));
    queue = module.get(getQueueToken('reversal'));
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should throw NotFoundException when the transaction does not exist', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(useCase.execute('tx-1', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when the transaction does not belong to the user', async () => {
      transactionRepo.findOne.mockResolvedValue(
        createTransaction({ wallet: createWallet({ userId: 'other-user' }) }),
      );

      await expect(useCase.execute('tx-1', 'user-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when the transaction cannot be reversed', async () => {
      transactionRepo.findOne.mockResolvedValue(
        createTransaction({ type: TransactionType.REVERSAL, status: TransactionStatus.REVERSED }),
      );

      await expect(useCase.execute('tx-1', 'user-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the transaction has already been fully reversed', async () => {
      transactionRepo.findOne.mockResolvedValue(createTransaction({ amount: 100 }));
      transactionRepo.find.mockResolvedValue([
        createTransaction({ id: 'rev-1', amount: 100, type: TransactionType.REVERSAL }),
      ]);

      await expect(useCase.execute('tx-1', 'user-1', {})).rejects.toThrow(BadRequestException);
      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when requested amount exceeds the reversable amount', async () => {
      transactionRepo.findOne.mockResolvedValue(createTransaction({ amount: 100 }));
      transactionRepo.find.mockResolvedValue([]);

      await expect(useCase.execute('tx-1', 'user-1', { amount: 150 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should queue a full reversal when no amount is provided', async () => {
      const transaction = createTransaction({ amount: 100 });
      transactionRepo.findOne.mockResolvedValue(transaction);
      transactionRepo.find.mockResolvedValue([]);
      transactionRepo.save.mockResolvedValue({
        id: 'reversal-1',
        walletId: wallet.id,
        amount: 100,
        type: TransactionType.REVERSAL,
        status: TransactionStatus.PENDING,
        relatedTransactionId: transaction.id,
      });

      const result = await useCase.execute('tx-1', 'user-1', {});

      expect(transactionRepo.create).toHaveBeenCalledWith({
        walletId: wallet.id,
        amount: 100,
        type: TransactionType.REVERSAL,
        status: TransactionStatus.PENDING,
        relatedTransactionId: transaction.id,
      });
      expect(queue.add).toHaveBeenCalledWith(
        'process-reversal',
        expect.objectContaining({
          reversalId: 'reversal-1',
          originalTransactionId: transaction.id,
          amount: 100,
          isFullReversal: true,
        }),
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      );
      expect(result).toEqual({
        reversalId: 'reversal-1',
        status: TransactionStatus.PENDING,
        amount: 100,
        message: 'Reversal request has been queued for processing',
      });
    });

    it('should queue a partial reversal when an amount smaller than the balance is provided', async () => {
      const transaction = createTransaction({ amount: 100 });
      transactionRepo.findOne.mockResolvedValue(transaction);
      transactionRepo.find.mockResolvedValue([]);
      transactionRepo.save.mockResolvedValue({
        id: 'reversal-1',
        walletId: wallet.id,
        amount: 40,
        type: TransactionType.REVERSAL,
        status: TransactionStatus.PENDING,
        relatedTransactionId: transaction.id,
      });

      const result = await useCase.execute('tx-1', 'user-1', { amount: 40 });

      expect(queue.add).toHaveBeenCalledWith(
        'process-reversal',
        expect.objectContaining({ amount: 40, isFullReversal: false }),
        expect.any(Object),
      );
      expect(result.amount).toBe(40);
    });

    it('should account for previously reversed amounts when calculating the reversable balance', async () => {
      const transaction = createTransaction({ amount: 100 });
      transactionRepo.findOne.mockResolvedValue(transaction);
      transactionRepo.find.mockResolvedValue([
        createTransaction({ id: 'rev-1', amount: 60, type: TransactionType.REVERSAL }),
      ]);
      transactionRepo.save.mockResolvedValue({
        id: 'reversal-2',
        walletId: wallet.id,
        amount: 40,
        type: TransactionType.REVERSAL,
        status: TransactionStatus.PENDING,
        relatedTransactionId: transaction.id,
      });

      const result = await useCase.execute('tx-1', 'user-1', {});

      expect(result.amount).toBe(40);
    });
  });
});

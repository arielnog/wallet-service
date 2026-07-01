import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '@/module/wallet/entities/wallet.entity';
import { Transaction } from '@/module/wallet/entities/transaction.entity';
import { TransactionType } from '@/module/wallet/enums/transaction-type.enum';
import { TransactionStatus } from '@/module/wallet/enums/transaction-status.enum';
import { TransactionDirection } from '@/module/wallet/enums/transaction-direction.enum';
import { GetStatementUseCase } from '@/module/wallet/use-cases/get-statement.use-case';

const mockWalletRepository = () => ({
  findOne: jest.fn(),
});

const mockTransactionRepository = () => ({
  find: jest.fn(),
  findBy: jest.fn(),
});

const wallet: Partial<Wallet> = { id: 'wallet-1', userId: 'user-1' };

const baseTransaction = (overrides: Partial<Transaction>): Transaction =>
  Object.assign(new Transaction(), {
    id: 'tx-1',
    amount: 50,
    walletId: wallet.id,
    targetWalletId: null,
    relatedTransactionId: null,
    createdAt: new Date('2026-06-15T12:00:00Z'),
    ...overrides,
  });

describe('GetStatementUseCase', () => {
  let useCase: GetStatementUseCase;
  let walletRepo: ReturnType<typeof mockWalletRepository>;
  let transactionRepo: ReturnType<typeof mockTransactionRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStatementUseCase,
        { provide: getRepositoryToken(Wallet), useFactory: mockWalletRepository },
        { provide: getRepositoryToken(Transaction), useFactory: mockTransactionRepository },
      ],
    }).compile();

    useCase = module.get(GetStatementUseCase);
    walletRepo = module.get(getRepositoryToken(Wallet));
    transactionRepo = module.get(getRepositoryToken(Transaction));
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should throw NotFoundException when wallet does not exist', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(
        useCase.execute('unknown-user', { startDate: '2026-06-01', endDate: '2026-06-30' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when startDate is after endDate', async () => {
      walletRepo.findOne.mockResolvedValue(wallet);

      await expect(
        useCase.execute('user-1', { startDate: '2026-06-30', endDate: '2026-06-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark a deposit as an incoming transaction', async () => {
      walletRepo.findOne.mockResolvedValue(wallet);
      transactionRepo.find.mockResolvedValue([
        baseTransaction({ type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED }),
      ]);
      transactionRepo.findBy.mockResolvedValue([]);

      const result = await useCase.execute('user-1', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(result).toEqual([
        expect.objectContaining({ id: 'tx-1', direction: TransactionDirection.IN, amount: 50 }),
      ]);
    });

    it('should mark an outgoing transfer as OUT for the sender wallet', async () => {
      walletRepo.findOne.mockResolvedValue(wallet);
      transactionRepo.find.mockResolvedValue([
        baseTransaction({
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          walletId: wallet.id,
          targetWalletId: 'wallet-2',
        }),
      ]);
      transactionRepo.findBy.mockResolvedValue([]);

      const result = await useCase.execute('user-1', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(result[0].direction).toBe(TransactionDirection.OUT);
    });

    it('should mark an incoming transfer as IN for the receiver wallet', async () => {
      walletRepo.findOne.mockResolvedValue(wallet);
      transactionRepo.find.mockResolvedValue([
        baseTransaction({
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          walletId: 'wallet-2',
          targetWalletId: wallet.id,
        }),
      ]);
      transactionRepo.findBy.mockResolvedValue([]);

      const result = await useCase.execute('user-1', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(result[0].direction).toBe(TransactionDirection.IN);
    });

    it('should resolve reversal direction from the original transaction type', async () => {
      walletRepo.findOne.mockResolvedValue(wallet);
      const reversalOfTransfer = baseTransaction({
        id: 'rev-1',
        type: TransactionType.REVERSAL,
        status: TransactionStatus.COMPLETED,
        relatedTransactionId: 'original-transfer',
      });
      const reversalOfDeposit = baseTransaction({
        id: 'rev-2',
        type: TransactionType.REVERSAL,
        status: TransactionStatus.COMPLETED,
        relatedTransactionId: 'original-deposit',
      });
      transactionRepo.find.mockResolvedValue([reversalOfTransfer, reversalOfDeposit]);
      transactionRepo.findBy.mockResolvedValue([
        { id: 'original-transfer', type: TransactionType.TRANSFER },
        { id: 'original-deposit', type: TransactionType.DEPOSIT },
      ]);

      const result = await useCase.execute('user-1', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(result.find((r) => r.id === 'rev-1')?.direction).toBe(TransactionDirection.IN);
      expect(result.find((r) => r.id === 'rev-2')?.direction).toBe(TransactionDirection.OUT);
    });

    it('should not query for original transactions when there are no reversals', async () => {
      walletRepo.findOne.mockResolvedValue(wallet);
      transactionRepo.find.mockResolvedValue([
        baseTransaction({ type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED }),
      ]);

      await useCase.execute('user-1', { startDate: '2026-06-01', endDate: '2026-06-30' });

      expect(transactionRepo.findBy).not.toHaveBeenCalled();
    });
  });
});

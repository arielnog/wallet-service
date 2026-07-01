import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Wallet } from '@/module/wallet/entities/wallet.entity';
import { Transaction } from '@/module/wallet/entities/transaction.entity';
import { TransactionType } from '@/module/wallet/enums/transaction-type.enum';
import { TransactionStatus } from '@/module/wallet/enums/transaction-status.enum';
import { DepositUseCase } from '@/module/wallet/use-cases/deposit.use-case';

const mockManager = () => ({
  findOneBy: jest.fn(),
  create: jest.fn((_entity, data) => data),
  save: jest.fn(),
  increment: jest.fn(),
});

describe('DepositUseCase', () => {
  let useCase: DepositUseCase;
  let manager: ReturnType<typeof mockManager>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    manager = mockManager();
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DepositUseCase, { provide: DataSource, useValue: dataSource }],
    }).compile();

    useCase = module.get(DepositUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    const wallet: Partial<Wallet> = { id: 'wallet-1', userId: 'user-1', balance: 100 };

    it('should throw NotFoundException when wallet does not exist', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(useCase.execute('unknown-user', { amount: 50 })).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('should create a completed deposit transaction and increment the balance', async () => {
      manager.findOneBy.mockResolvedValue(wallet);
      const savedTransaction: Partial<Transaction> = {
        id: 'tx-1',
        walletId: wallet.id,
        amount: 50,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
      };
      manager.save.mockResolvedValue(savedTransaction);

      const result = await useCase.execute('user-1', { amount: 50 });

      expect(manager.create).toHaveBeenCalledWith(Transaction, {
        walletId: wallet.id,
        amount: 50,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
      });
      expect(manager.increment).toHaveBeenCalledWith(Wallet, { id: wallet.id }, 'balance', 50);
      expect(result).toBe(savedTransaction);
    });
  });
});

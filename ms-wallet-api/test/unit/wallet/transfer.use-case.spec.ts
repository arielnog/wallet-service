import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Wallet } from '@/module/wallet/entities/wallet.entity';
import { Transaction } from '@/module/wallet/entities/transaction.entity';
import { TransactionType } from '@/module/wallet/enums/transaction-type.enum';
import { TransactionStatus } from '@/module/wallet/enums/transaction-status.enum';
import { TransferUseCase } from '@/module/wallet/use-cases/transfer.use-case';

const mockRepository = () => ({});

const mockManager = () => ({
  findOneBy: jest.fn(),
  create: jest.fn((_entity, data) => data),
  save: jest.fn(),
  decrement: jest.fn(),
  increment: jest.fn(),
});

const createWallet = (overrides: Partial<Wallet> = {}): Wallet =>
  Object.assign(new Wallet(), { id: 'wallet-1', userId: 'user-1', balance: 100, ...overrides });

describe('TransferUseCase', () => {
  let useCase: TransferUseCase;
  let manager: ReturnType<typeof mockManager>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    manager = mockManager();
    dataSource = { transaction: jest.fn((cb) => cb(manager)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferUseCase,
        { provide: getRepositoryToken(Wallet), useFactory: mockRepository },
        { provide: getRepositoryToken(Transaction), useFactory: mockRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    useCase = module.get(TransferUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should throw BadRequestException when transferring to the same user', async () => {
      await expect(
        useCase.execute('user-1', { toUserId: 'user-1', amount: 10 }),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the sender wallet does not exist', async () => {
      manager.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(createWallet());

      await expect(
        useCase.execute('user-1', { toUserId: 'user-2', amount: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the receiver wallet does not exist', async () => {
      manager.findOneBy.mockResolvedValueOnce(createWallet()).mockResolvedValueOnce(null);

      await expect(
        useCase.execute('user-1', { toUserId: 'user-2', amount: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on insufficient balance', async () => {
      const sender = createWallet({ balance: 5 });
      const receiver = createWallet({ id: 'wallet-2', userId: 'user-2' });
      manager.findOneBy.mockResolvedValueOnce(sender).mockResolvedValueOnce(receiver);

      await expect(
        useCase.execute('user-1', { toUserId: 'user-2', amount: 10 }),
      ).rejects.toThrow(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('should transfer funds and return the transfer response', async () => {
      const sender = createWallet({ balance: 100 });
      const receiver = createWallet({ id: 'wallet-2', userId: 'user-2', balance: 20 });
      manager.findOneBy.mockResolvedValueOnce(sender).mockResolvedValueOnce(receiver);

      const createdAt = new Date('2026-06-01T10:00:00Z');
      manager.save.mockResolvedValue({
        id: 'tx-1',
        walletId: sender.id,
        targetWalletId: receiver.id,
        amount: 30,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.COMPLETED,
        createdAt,
      });

      const result = await useCase.execute('user-1', { toUserId: 'user-2', amount: 30 });

      expect(manager.create).toHaveBeenCalledWith(Transaction, {
        walletId: sender.id,
        amount: 30,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.COMPLETED,
        targetWalletId: receiver.id,
      });
      expect(manager.decrement).toHaveBeenCalledWith(Wallet, { id: sender.id }, 'balance', 30);
      expect(manager.increment).toHaveBeenCalledWith(Wallet, { id: receiver.id }, 'balance', 30);
      expect(result).toEqual({
        transactionId: 'tx-1',
        status: TransactionStatus.COMPLETED,
        amount: 30,
        receiverWalletId: receiver.id,
        createdAt,
      });
    });
  });
});

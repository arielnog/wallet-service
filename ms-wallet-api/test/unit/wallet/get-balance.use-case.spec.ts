import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '@/module/wallet/entities/wallet.entity';
import { GetBalanceUseCase } from '@/module/wallet/use-cases/get-balance.use-case';

const mockWalletRepository = () => ({
  findOne: jest.fn(),
});

describe('GetBalanceUseCase', () => {
  let useCase: GetBalanceUseCase;
  let walletRepo: ReturnType<typeof mockWalletRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBalanceUseCase,
        { provide: getRepositoryToken(Wallet), useFactory: mockWalletRepository },
      ],
    }).compile();

    useCase = module.get(GetBalanceUseCase);
    walletRepo = module.get(getRepositoryToken(Wallet));
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should return the wallet balance', async () => {
      walletRepo.findOne.mockResolvedValue({ id: 'wallet-1', userId: 'user-1', balance: 150 });

      const result = await useCase.execute('user-1');

      expect(result).toEqual({ balance: 150 });
      expect(walletRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(useCase.execute('unknown-user')).rejects.toThrow(NotFoundException);
    });
  });
});

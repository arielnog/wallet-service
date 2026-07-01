import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '@/module/wallet/entities/wallet.entity';
import { CreateWalletUseCase } from '@/module/wallet/use-cases/create-wallet.use-case';

const mockWalletRepository = () => ({
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('CreateWalletUseCase', () => {
  let useCase: CreateWalletUseCase;
  let walletRepo: ReturnType<typeof mockWalletRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateWalletUseCase,
        { provide: getRepositoryToken(Wallet), useFactory: mockWalletRepository },
      ],
    }).compile();

    useCase = module.get(CreateWalletUseCase);
    walletRepo = module.get(getRepositoryToken(Wallet));
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should return the existing wallet without creating a new one', async () => {
      const existing = { id: 'wallet-1', userId: 'user-1', balance: 0 };
      walletRepo.findOneBy.mockResolvedValue(existing);

      const result = await useCase.execute('user-1');

      expect(result).toBe(existing);
      expect(walletRepo.create).not.toHaveBeenCalled();
      expect(walletRepo.save).not.toHaveBeenCalled();
    });

    it('should create and persist a new wallet with zero balance when none exists', async () => {
      walletRepo.findOneBy.mockResolvedValue(null);
      const created = { userId: 'user-1', balance: 0 };
      const saved = { id: 'wallet-1', ...created };
      walletRepo.create.mockReturnValue(created);
      walletRepo.save.mockResolvedValue(saved);

      const result = await useCase.execute('user-1');

      expect(walletRepo.create).toHaveBeenCalledWith({ userId: 'user-1', balance: 0 });
      expect(walletRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(saved);
    });
  });
});

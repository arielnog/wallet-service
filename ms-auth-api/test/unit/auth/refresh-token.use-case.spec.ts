import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { LoginUseCase } from '@/modules/auth/use-cases/login.use-case';
import { RefreshTokenUseCase } from '@/modules/auth/use-cases/refresh-token.use-case';

const mockTokenRepository = () => ({
  findOneBy: jest.fn(),
  update: jest.fn(),
});

const mockLoginUseCase = () => ({
  issueTokens: jest.fn().mockResolvedValue({ accessToken: 'new-jwt', refreshToken: 'new-refresh' }),
});

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let tokenRepo: ReturnType<typeof mockTokenRepository>;
  let loginUseCase: ReturnType<typeof mockLoginUseCase>;

  const validRecord: Partial<RefreshToken> = {
    id: 'record-uuid',
    token: 'valid-token',
    userId: 'user-uuid',
    revokedAt: null as any,
    expiresAt: new Date(Date.now() + 60_000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        { provide: getRepositoryToken(RefreshToken), useFactory: mockTokenRepository },
        { provide: LoginUseCase, useFactory: mockLoginUseCase },
      ],
    }).compile();

    useCase = module.get(RefreshTokenUseCase);
    tokenRepo = module.get(getRepositoryToken(RefreshToken));
    loginUseCase = module.get(LoginUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should revoke current token and return new token pair', async () => {
      tokenRepo.findOneBy.mockResolvedValue(validRecord);
      tokenRepo.update.mockResolvedValue(undefined);

      const result = await useCase.execute('valid-token');

      expect(tokenRepo.update).toHaveBeenCalledWith(validRecord.id, { revokedAt: expect.any(Date) });
      expect(loginUseCase.issueTokens).toHaveBeenCalledWith(validRecord.userId);
      expect(result).toEqual({ accessToken: 'new-jwt', refreshToken: 'new-refresh' });
    });

    it('should throw UnauthorizedException when token does not exist', async () => {
      tokenRepo.findOneBy.mockResolvedValue(null);

      await expect(useCase.execute('ghost-token')).rejects.toThrow(UnauthorizedException);
      expect(loginUseCase.issueTokens).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is already revoked', async () => {
      tokenRepo.findOneBy.mockResolvedValue({ ...validRecord, revokedAt: new Date() });

      await expect(useCase.execute('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      tokenRepo.findOneBy.mockResolvedValue({
        ...validRecord,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(useCase.execute('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revoke', () => {
    it('should revoke token and return success message', async () => {
      tokenRepo.findOneBy.mockResolvedValue(validRecord);
      tokenRepo.update.mockResolvedValue(undefined);

      const result = await useCase.revoke('valid-token');

      expect(tokenRepo.update).toHaveBeenCalledWith(validRecord.id, { revokedAt: expect.any(Date) });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should throw UnauthorizedException when token is not found or already revoked', async () => {
      tokenRepo.findOneBy.mockResolvedValue(null);

      await expect(useCase.revoke('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});

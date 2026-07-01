import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { User } from '@/modules/users/entities/user.entity';
import { LoginUseCase } from '@/modules/auth/use-cases/login.use-case';

jest.mock('bcrypt');

const mockUserRepository = () => ({
  findOne: jest.fn(),
});

const mockRefreshTokenRepository = () => ({
  update: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('signed-jwt'),
});

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let refreshTokenRepo: ReturnType<typeof mockRefreshTokenRepository>;
  let jwtService: ReturnType<typeof mockJwtService>;

  const user: Partial<User> = {
    id: 'uuid-1',
    email: 'john@test.com',
    password: 'hashed',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useFactory: mockRefreshTokenRepository },
        { provide: JwtService, useFactory: mockJwtService },
      ],
    }).compile();

    useCase = module.get(LoginUseCase);
    userRepo = module.get(getRepositoryToken(User));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should return access and refresh tokens on valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(user);
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      refreshTokenRepo.update.mockResolvedValue(undefined);
      refreshTokenRepo.create.mockReturnValue({ token: 'refresh-uuid', userId: user.id });
      refreshTokenRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({ email: user.email!, password: 'plain' });

      expect(result).toEqual({ accessToken: 'signed-jwt', refreshToken: 'refresh-uuid' });
      expect(refreshTokenRepo.update).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        useCase.execute({ email: 'unknown@test.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      userRepo.findOne.mockResolvedValue(user);
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        useCase.execute({ email: user.email!, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke all active refresh tokens before issuing new ones', async () => {
      userRepo.findOne.mockResolvedValue(user);
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      refreshTokenRepo.update.mockResolvedValue(undefined);
      refreshTokenRepo.create.mockReturnValue({ token: 'refresh-uuid', userId: user.id });
      refreshTokenRepo.save.mockResolvedValue(undefined);

      await useCase.execute({ email: user.email!, password: 'plain' });

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user.id }),
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('issueTokens', () => {
    it('should sign a JWT and persist the refresh token', async () => {
      const refreshTokenEntity = { token: 'refresh-uuid', userId: 'uuid-1' };
      refreshTokenRepo.create.mockReturnValue(refreshTokenEntity);
      refreshTokenRepo.save.mockResolvedValue(undefined);

      const result = await useCase.issueTokens('uuid-1');

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'uuid-1' }, { expiresIn: '15m' });
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(refreshTokenEntity);
      expect(result).toEqual({ accessToken: 'signed-jwt', refreshToken: 'refresh-uuid' });
    });
  });
});

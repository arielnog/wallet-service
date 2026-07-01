import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { PasswordReset } from '@/modules/auth/entities/password-reset.entity';
import { User } from '@/modules/users/entities/user.entity';
import { ResetPasswordUseCase } from '@/modules/auth/use-cases/reset-password.use-case';

jest.mock('bcrypt');

const mockResetRepository = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockUserRepository = () => ({
  update: jest.fn(),
});

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let resetRepo: ReturnType<typeof mockResetRepository>;
  let userRepo: ReturnType<typeof mockUserRepository>;

  const validReset: Partial<PasswordReset> = {
    id: 'reset-uuid',
    token: 'valid-token',
    userId: 'user-uuid',
    usedAt: null as any,
    expiresAt: new Date(Date.now() + 60_000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordUseCase,
        { provide: getRepositoryToken(PasswordReset), useFactory: mockResetRepository },
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
      ],
    }).compile();

    useCase = module.get(ResetPasswordUseCase);
    resetRepo = module.get(getRepositoryToken(PasswordReset));
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should update password and mark reset token as used', async () => {
      resetRepo.findOne.mockResolvedValue(validReset);
      userRepo.update.mockResolvedValue(undefined);
      resetRepo.update.mockResolvedValue(undefined);
      jest.mocked(bcrypt.hash).mockResolvedValue('new-hashed' as never);

      const result = await useCase.execute('valid-token', 'NewPass@123!');

      expect(userRepo.update).toHaveBeenCalledWith(validReset.userId, { password: 'new-hashed' });
      expect(resetRepo.update).toHaveBeenCalledWith(validReset.id, { usedAt: expect.any(Date) });
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw BadRequestException when token does not exist', async () => {
      resetRepo.findOne.mockResolvedValue(null);

      await expect(useCase.execute('ghost-token', 'NewPass@123!')).rejects.toThrow(BadRequestException);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when token has already been used', async () => {
      resetRepo.findOne.mockResolvedValue({ ...validReset, usedAt: new Date() });

      await expect(useCase.execute('valid-token', 'NewPass@123!')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token is expired', async () => {
      resetRepo.findOne.mockResolvedValue({ ...validReset, expiresAt: new Date(Date.now() - 1000) });

      await expect(useCase.execute('valid-token', 'NewPass@123!')).rejects.toThrow(BadRequestException);
    });

    it('should hash the new password before updating', async () => {
      resetRepo.findOne.mockResolvedValue(validReset);
      userRepo.update.mockResolvedValue(undefined);
      resetRepo.update.mockResolvedValue(undefined);
      jest.mocked(bcrypt.hash).mockResolvedValue('new-hashed' as never);

      await useCase.execute('valid-token', 'NewPass@123!');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass@123!', 10);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordReset } from '@/modules/auth/entities/password-reset.entity';
import { User } from '@/modules/users/entities/user.entity';
import { NotificationsProducer } from '@/modules/notifications/notifications.producer';
import { ForgotPasswordUseCase } from '@/modules/auth/use-cases/forgot-password.use-case';

const mockUserRepository = () => ({
  findOneBy: jest.fn(),
});

const mockResetRepository = () => ({
  update: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockNotificationsProducer = () => ({
  enqueue: jest.fn().mockResolvedValue(undefined),
});

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let resetRepo: ReturnType<typeof mockResetRepository>;
  let notificationsProducer: ReturnType<typeof mockNotificationsProducer>;

  const user: Partial<User> = { id: 'uuid-1', email: 'john@test.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForgotPasswordUseCase,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        { provide: getRepositoryToken(PasswordReset), useFactory: mockResetRepository },
        { provide: NotificationsProducer, useFactory: mockNotificationsProducer },
      ],
    }).compile();

    useCase = module.get(ForgotPasswordUseCase);
    userRepo = module.get(getRepositoryToken(User));
    resetRepo = module.get(getRepositoryToken(PasswordReset));
    notificationsProducer = module.get(NotificationsProducer);
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    it('should return generic message without revealing if email exists', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      const result = await useCase.execute('unknown@test.com');

      expect(result).toEqual({ message: 'If the email exists, a link has been sent' });
      expect(resetRepo.save).not.toHaveBeenCalled();
      expect(notificationsProducer.enqueue).not.toHaveBeenCalled();
    });

    it('should create a reset token and enqueue notification when user exists', async () => {
      userRepo.findOneBy.mockResolvedValue(user);
      resetRepo.update.mockResolvedValue(undefined);
      resetRepo.create.mockReturnValue({ token: 'reset-uuid', userId: user.id });
      resetRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute(user.email!);

      expect(resetRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user.id }),
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
      expect(resetRepo.save).toHaveBeenCalledTimes(1);
      expect(notificationsProducer.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ to: user.email, subject: 'Password reset' }),
      );
      expect(result).toEqual({ message: 'If the email exists, a link has been sent' });
    });

    it('should invalidate previous reset tokens before creating a new one', async () => {
      userRepo.findOneBy.mockResolvedValue(user);
      resetRepo.update.mockResolvedValue(undefined);
      resetRepo.create.mockReturnValue({});
      resetRepo.save.mockResolvedValue(undefined);

      await useCase.execute(user.email!);

      expect(resetRepo.update).toHaveBeenCalled();
    });
  });
});

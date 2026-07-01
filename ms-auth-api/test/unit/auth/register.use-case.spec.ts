import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@/modules/users/entities/user.entity';
import { RegisterUseCase } from '@/modules/auth/use-cases/register.use-case';

jest.mock('bcrypt');

const mockUserRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let userRepo: ReturnType<typeof mockUserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
      ],
    }).compile();

    useCase = module.get(RegisterUseCase);
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    const dto = { name: 'John Doe', email: 'john@test.com', password: 'Test@1234!' };
    const createdUser = { id: 'uuid-1', name: dto.name, email: dto.email, password: 'hashed' };

    it('should register user and return public data', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);

      const result = await useCase.execute(dto);

      expect(result).toEqual({ id: 'uuid-1', name: 'John Doe', email: 'john@test.com' });
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
    });

    it('should throw ConflictException when email is already registered', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing-uuid' });

      await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should hash the password before saving', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);

      await useCase.execute(dto);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed' }),
      );
    });
  });
});

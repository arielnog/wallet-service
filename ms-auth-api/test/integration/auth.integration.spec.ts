import { ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { PasswordReset } from '@/modules/auth/entities/password-reset.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { AuthController } from '@/modules/auth/auth.controller';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { LocalStrategy } from '@/modules/auth/strategies/local.strategy';
import { ForgotPasswordUseCase } from '@/modules/auth/use-cases/forgot-password.use-case';
import { LoginUseCase } from '@/modules/auth/use-cases/login.use-case';
import { RefreshTokenUseCase } from '@/modules/auth/use-cases/refresh-token.use-case';
import { RegisterUseCase } from '@/modules/auth/use-cases/register.use-case';
import { ResetPasswordUseCase } from '@/modules/auth/use-cases/reset-password.use-case';
import { NotificationsProducer } from '@/modules/notifications/notifications.producer';
import { User } from '@/modules/users/entities/user.entity';

const TEST_JWT_SECRET = 'integration-test-secret';

describe('Auth (integration)', () => {
  let app: any;
  let userRepo: Repository<User>;
  let refreshTokenRepo: Repository<RefreshToken>;
  let resetRepo: Repository<PasswordReset>;
  let notificationsProducer: { enqueue: jest.Mock };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    notificationsProducer = { enqueue: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [User, RefreshToken, PasswordReset],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([User, RefreshToken, PasswordReset]),
        PassportModule,
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '15m' } }),
      ],
      controllers: [AuthController],
      providers: [
        LocalStrategy,
        JwtStrategy,
        RegisterUseCase,
        LoginUseCase,
        RefreshTokenUseCase,
        ForgotPasswordUseCase,
        ResetPasswordUseCase,
        { provide: NotificationsProducer, useValue: notificationsProducer },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    userRepo = module.get(getRepositoryToken(User));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    resetRepo = module.get(getRepositoryToken(PasswordReset));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetRepo.clear();
    await refreshTokenRepo.clear();
    await userRepo.clear();
    notificationsProducer.enqueue.mockClear();
  });

  // ─── Register ────────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    const dto = { name: 'John Doe', email: 'john@test.com', password: 'Test@1234!' };

    it('should register a new user and return 201 with public data', async () => {
      const res = await request(app.getHttpServer()).post('/auth/register').send(dto);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: dto.name, email: dto.email });
      expect(res.body).toHaveProperty('id');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 409 when email is already registered', async () => {
      await request(app.getHttpServer()).post('/auth/register').send(dto);
      const res = await request(app.getHttpServer()).post('/auth/register').send(dto);

      expect(res.status).toBe(409);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'missing@test.com' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Login ───────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const credentials = { email: 'john@test.com', password: 'Test@1234!' };

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'John', ...credentials });
    });

    it('should return access and refresh tokens on valid credentials', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send(credentials);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should return 401 on wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...credentials, password: 'WrongPass@1!' });

      expect(res.status).toBe(401);
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ghost@test.com', password: 'Test@1234!' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should return new token pair on valid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: 'Test@1234!' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'john@test.com', password: 'Test@1234!' });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.refreshToken).not.toBe(loginRes.body.refreshToken);
    });

    it('should return 401 on invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'non-existent-token' });

      expect(res.status).toBe(401);
    });

    it('should return 401 when reusing a rotated token', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: 'Test@1234!' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'john@test.com', password: 'Test@1234!' });

      const oldToken = loginRes.body.refreshToken;
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: oldToken });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldToken });

      expect(res.status).toBe(401);
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should revoke refresh token when authenticated', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: 'Test@1234!' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'john@test.com', password: 'Test@1234!' });

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'Logged out successfully' });
    });

    it('should return 401 without JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'any-token' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Forgot password ─────────────────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('should return generic message for existing email and enqueue notification', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: 'Test@1234!' });

      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'john@test.com' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'If the email exists, a link has been sent' });
      expect(notificationsProducer.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'john@test.com', subject: 'Password reset' }),
      );
    });

    it('should return same generic message for non-existent email without enqueuing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'ghost@test.com' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'If the email exists, a link has been sent' });
      expect(notificationsProducer.enqueue).not.toHaveBeenCalled();
    });
  });

  // ─── Reset password ──────────────────────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    it('should change password and allow login with new credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: 'Test@1234!' });

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'john@test.com' });

      const user = await userRepo.findOneByOrFail({ email: 'john@test.com' });
      const { token } = await resetRepo.findOneByOrFail({ userId: user.id });

      const resetRes = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewPass@5678!' });

      expect(resetRes.status).toBe(201);
      expect(resetRes.body).toEqual({ message: 'Password changed successfully' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'john@test.com', password: 'NewPass@5678!' });

      expect(loginRes.status).toBe(201);
      expect(loginRes.body).toHaveProperty('accessToken');
    });

    it('should return 400 for invalid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPass@5678!' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when token is used a second time', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: 'Test@1234!' });

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'john@test.com' });

      const user = await userRepo.findOneByOrFail({ email: 'john@test.com' });
      const { token } = await resetRepo.findOneByOrFail({ userId: user.id });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewPass@5678!' });

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'AnotherPass@9!' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Full user journey ────────────────────────────────────────────────────────

  describe('full auth flow', () => {
    it('register → login → refresh → logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: 'Test@1234!' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'john@test.com', password: 'Test@1234!' });

      expect(loginRes.body).toHaveProperty('accessToken');

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(refreshRes.body).toHaveProperty('accessToken');

      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
        .send({ refreshToken: refreshRes.body.refreshToken });

      expect(logoutRes.body).toEqual({ message: 'Logged out successfully' });

      const refreshAfterLogout = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: refreshRes.body.refreshToken });

      expect(refreshAfterLogout.status).toBe(401);
    });
  });
});

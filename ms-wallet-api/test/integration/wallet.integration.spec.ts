import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import request from 'supertest';
import { Repository } from 'typeorm';
import { Wallet } from '@/module/wallet/entities/wallet.entity';
import { Transaction } from '@/module/wallet/entities/transaction.entity';
import { TransactionType } from '@/module/wallet/enums/transaction-type.enum';
import { TransactionStatus } from '@/module/wallet/enums/transaction-status.enum';
import { WalletController } from '@/module/wallet/wallet.controller';
import { CreateWalletUseCase } from '@/module/wallet/use-cases/create-wallet.use-case';
import { GetBalanceUseCase } from '@/module/wallet/use-cases/get-balance.use-case';
import { DepositUseCase } from '@/module/wallet/use-cases/deposit.use-case';
import { TransferUseCase } from '@/module/wallet/use-cases/transfer.use-case';
import { ReversalUseCase } from '@/module/wallet/use-cases/reversal.use-case';
import { GetStatementUseCase } from '@/module/wallet/use-cases/get-statement.use-case';

describe('Wallet (integration)', () => {
  let app: any;
  let walletRepo: Repository<Wallet>;
  let transactionRepo: Repository<Transaction>;
  let reversalQueue: { add: jest.Mock };

  const createWallet = (userId: string) =>
    request(app.getHttpServer()).post('/wallet').set('x-user-id', userId);

  const deposit = (userId: string, amount: number) =>
    request(app.getHttpServer())
      .post('/wallet/deposit')
      .set('x-user-id', userId)
      .send({ amount });

  beforeAll(async () => {
    reversalQueue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Wallet, Transaction],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([Wallet, Transaction]),
      ],
      controllers: [WalletController],
      providers: [
        CreateWalletUseCase,
        GetBalanceUseCase,
        DepositUseCase,
        TransferUseCase,
        ReversalUseCase,
        GetStatementUseCase,
        { provide: getQueueToken('reversal'), useValue: reversalQueue },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    walletRepo = module.get(getRepositoryToken(Wallet));
    transactionRepo = module.get(getRepositoryToken(Transaction));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await transactionRepo.clear();
    await walletRepo.clear();
    reversalQueue.add.mockClear();
  });

  // ─── Create wallet ──────────────────────────────────────────────────────────

  describe('POST /wallet', () => {
    it('should create a new wallet with zero balance', async () => {
      const res = await createWallet('user-1');

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ userId: 'user-1', balance: 0 });
      expect(res.body).toHaveProperty('id');
    });

    it('should return the same wallet when called again for the same user', async () => {
      const first = await createWallet('user-1');
      const second = await createWallet('user-1');

      expect(second.status).toBe(201);
      expect(second.body.id).toBe(first.body.id);
    });
  });

  // ─── Balance ────────────────────────────────────────────────────────────────

  describe('GET /wallet/balance', () => {
    it('should return 404 when the user has no wallet', async () => {
      const res = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('x-user-id', 'ghost-user');

      expect(res.status).toBe(404);
    });

    it('should return the current balance', async () => {
      await createWallet('user-1');

      const res = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ balance: 0 });
    });
  });

  // ─── Deposit ────────────────────────────────────────────────────────────────

  describe('POST /wallet/deposit', () => {
    it('should return 404 when the user has no wallet', async () => {
      const res = await deposit('ghost-user', 50);

      expect(res.status).toBe(404);
    });

    it('should return 400 for a non-positive amount', async () => {
      await createWallet('user-1');

      const res = await deposit('user-1', 0);

      expect(res.status).toBe(400);
    });

    it('should credit the wallet and return the completed transaction', async () => {
      await createWallet('user-1');

      const res = await deposit('user-1', 100);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        amount: '100.00',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
      });

      const balanceRes = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('x-user-id', 'user-1');
      expect(balanceRes.body).toEqual({ balance: 100 });
    });
  });

  // ─── Transfer ───────────────────────────────────────────────────────────────

  describe('POST /wallet/transfer', () => {
    beforeEach(async () => {
      await createWallet('user-1');
      await createWallet('user-2');
      await deposit('user-1', 100);
    });

    it('should return 400 when transferring to yourself', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/transfer')
        .set('x-user-id', 'user-1')
        .send({ toUserId: 'user-1', amount: 10 });

      expect(res.status).toBe(400);
    });

    it('should return 404 when the receiver has no wallet', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/transfer')
        .set('x-user-id', 'user-1')
        .send({ toUserId: 'ghost-user', amount: 10 });

      expect(res.status).toBe(404);
    });

    it('should return 400 on insufficient balance', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/transfer')
        .set('x-user-id', 'user-1')
        .send({ toUserId: 'user-2', amount: 1000 });

      expect(res.status).toBe(400);
    });

    it('should move funds between wallets and return the transfer details', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/transfer')
        .set('x-user-id', 'user-1')
        .send({ toUserId: 'user-2', amount: 40 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ amount: '40.00', status: TransactionStatus.COMPLETED });
      expect(res.body).toHaveProperty('transactionId');
      expect(res.body).toHaveProperty('receiverWalletId');

      const senderBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('x-user-id', 'user-1');
      const receiverBalance = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('x-user-id', 'user-2');

      expect(senderBalance.body).toEqual({ balance: 60 });
      expect(receiverBalance.body).toEqual({ balance: 40 });
    });
  });

  // ─── Reversal ───────────────────────────────────────────────────────────────

  describe('POST /wallet/reversal/:transactionId', () => {
    it('should return 404 when the transaction does not exist', async () => {
      await createWallet('user-1');

      const res = await request(app.getHttpServer())
        .post('/wallet/reversal/00000000-0000-0000-0000-000000000000')
        .set('x-user-id', 'user-1')
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 403 when the transaction belongs to another user', async () => {
      await createWallet('user-1');
      await createWallet('user-2');
      const depositRes = await deposit('user-1', 100);

      const res = await request(app.getHttpServer())
        .post(`/wallet/reversal/${depositRes.body.id}`)
        .set('x-user-id', 'user-2')
        .send({});

      expect(res.status).toBe(403);
    });

    it('should queue a full reversal and return a pending response', async () => {
      await createWallet('user-1');
      const depositRes = await deposit('user-1', 100);

      const res = await request(app.getHttpServer())
        .post(`/wallet/reversal/${depositRes.body.id}`)
        .set('x-user-id', 'user-1')
        .send({});

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ status: TransactionStatus.PENDING, amount: 100 });
      expect(reversalQueue.add).toHaveBeenCalledWith(
        'process-reversal',
        expect.objectContaining({ originalTransactionId: depositRes.body.id, isFullReversal: true }),
        expect.any(Object),
      );
    });

    it('should return 400 when the requested amount exceeds the reversable balance', async () => {
      await createWallet('user-1');
      const depositRes = await deposit('user-1', 100);

      const res = await request(app.getHttpServer())
        .post(`/wallet/reversal/${depositRes.body.id}`)
        .set('x-user-id', 'user-1')
        .send({ amount: 150 });

      expect(res.status).toBe(400);
    });

    it('should return 400 when the transaction has already been fully reversed', async () => {
      await createWallet('user-1');
      const depositRes = await deposit('user-1', 100);

      await request(app.getHttpServer())
        .post(`/wallet/reversal/${depositRes.body.id}`)
        .set('x-user-id', 'user-1')
        .send({});

      const res = await request(app.getHttpServer())
        .post(`/wallet/reversal/${depositRes.body.id}`)
        .set('x-user-id', 'user-1')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── Statement ──────────────────────────────────────────────────────────────

  describe('GET /wallet/statement', () => {
    it('should return 400 when query params are missing', async () => {
      await createWallet('user-1');

      const res = await request(app.getHttpServer())
        .get('/wallet/statement')
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(400);
    });

    it('should return 404 when the user has no wallet', async () => {
      const res = await request(app.getHttpServer())
        .get('/wallet/statement?startDate=2026-06-01&endDate=2026-06-30')
        .set('x-user-id', 'ghost-user');

      expect(res.status).toBe(404);
    });

    it('should return 400 when startDate is after endDate', async () => {
      await createWallet('user-1');

      const res = await request(app.getHttpServer())
        .get('/wallet/statement?startDate=2026-06-30&endDate=2026-06-01')
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(400);
    });

    it('should list deposits and transfers within the date range', async () => {
      await createWallet('user-1');
      await createWallet('user-2');
      await deposit('user-1', 100);
      await request(app.getHttpServer())
        .post('/wallet/transfer')
        .set('x-user-id', 'user-1')
        .send({ toUserId: 'user-2', amount: 30 });

      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app.getHttpServer())
        .get(`/wallet/statement?startDate=${today}&endDate=${today}`)
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((t: any) => t.type).sort()).toEqual(
        [TransactionType.DEPOSIT, TransactionType.TRANSFER].sort(),
      );
    });
  });
});

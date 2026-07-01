import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { WalletController } from './wallet.controller';
import { CreateWalletUseCase } from './use-cases/create-wallet.use-case';
import { GetBalanceUseCase } from './use-cases/get-balance.use-case';
import { DepositUseCase } from './use-cases/deposit.use-case';
import { TransferUseCase } from './use-cases/transfer.use-case';
// corrigido: ReversalUseCase e ReversalProcessor estavam faltando nos providers,
// causando erro de DI no startup; a fila 'reversal' também não estava registrada
import { ReversalUseCase } from './use-cases/reversal.use-case';
import { ReversalProcessor } from './processors/reversal.processor';
import { GetStatementUseCase } from './use-cases/get-statement.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction]),
    // registra a fila consumida pelo ReversalProcessor
    BullModule.registerQueue({ name: 'reversal' }),
  ],
  controllers: [WalletController],
  providers: [
    CreateWalletUseCase,
    GetBalanceUseCase,
    DepositUseCase,
    TransferUseCase,
    ReversalUseCase,
    ReversalProcessor,
    GetStatementUseCase,
  ],
})
export class WalletModule {}

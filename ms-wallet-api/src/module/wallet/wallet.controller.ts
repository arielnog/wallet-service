import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { CreateWalletUseCase } from "./use-cases/create-wallet.use-case";
import { GetBalanceUseCase } from "./use-cases/get-balance.use-case";
import { DepositUseCase } from "./use-cases/deposit.use-case";
import { TransferUseCase } from "./use-cases/transfer.use-case";
import { DepositDto } from "./dtos/deposit.dto";
import { TransferDto } from "./dtos/transfer.dto";
import { ReversalDto } from "./dtos/reversal.dto";
import { ReversalUseCase } from "./use-cases/reversal.use-case";
import { StatementQueryDto } from "./dtos/statement-query.dto";
import { GetStatementUseCase } from "./use-cases/get-statement.use-case";

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getBalanceUseCase: GetBalanceUseCase,
    private readonly depositUseCase: DepositUseCase,
    private readonly transferUseCase: TransferUseCase,
    private readonly reversalUseCase: ReversalUseCase,
    private readonly getStatementUseCase: GetStatementUseCase,
  ) {}

  @Post()
  create(@Headers('x-user-id') userId: string) {
    return this.createWalletUseCase.execute(userId);
  }

  @Get('balance')
  getBalance(@Headers('x-user-id') userId: string) {
    return this.getBalanceUseCase.execute(userId);
  }

  @Post('deposit')
  deposit(
    @Headers('x-user-id') userId: string,
    @Body() dto: DepositDto,
  ) {
    return this.depositUseCase.execute(userId, dto);
  }

  @Post('transfer')
  transfer(
    @Headers('x-user-id') userId: string,
    @Body() dto: TransferDto,
  ) {
    return this.transferUseCase.execute(userId, dto);
  }

@Post('reversal/:transactionId')
reversal(
  @Headers('x-user-id') userId: string,
  @Param('transactionId') transactionId: string,
  @Body() dto: ReversalDto,
) {
  return this.reversalUseCase.execute(transactionId, userId, dto);
}

  @Get('statement')
  getStatement(
    @Headers('x-user-id') userId: string,
    @Query() query: StatementQueryDto,
  ) {
    return this.getStatementUseCase.execute(userId, query);
  }
}